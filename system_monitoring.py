#!/usr/bin/env python3
"""
System Monitoring and Health Check Implementation
Comprehensive monitoring for production deployment
"""

import asyncio
import json
import time
import psutil
import requests
from datetime import datetime, timedelta
from typing import Dict, List, Any, Optional
from dataclasses import dataclass, asdict
import logging

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

@dataclass
class SystemMetrics:
    timestamp: datetime
    cpu_usage: float
    memory_usage: float
    disk_usage: float
    gpu_usage: Optional[float]
    gpu_memory: Optional[float]
    network_io: Dict[str, int]
    process_count: int

@dataclass
class ServiceHealth:
    service_name: str
    status: str  # "healthy", "degraded", "unhealthy"
    response_time: Optional[float]
    last_check: datetime
    error_message: Optional[str]
    uptime: Optional[float]

@dataclass
class ModelHealth:
    model_name: str
    status: str
    avg_response_time: float
    success_rate: float
    last_request: Optional[datetime]
    error_count: int
    total_requests: int

class SystemMonitor:
    """Comprehensive system monitoring"""
    
    def __init__(self):
        self.metrics_history: List[SystemMetrics] = []
        self.service_health: Dict[str, ServiceHealth] = {}
        self.model_health: Dict[str, ModelHealth] = {}
        self.alerts: List[Dict[str, Any]] = []
        
    def collect_system_metrics(self) -> SystemMetrics:
        """Collect current system metrics"""
        
        # CPU and Memory
        cpu_usage = psutil.cpu_percent(interval=1)
        memory = psutil.virtual_memory()
        disk = psutil.disk_usage('/')
        
        # Network I/O
        network = psutil.net_io_counters()
        network_io = {
            "bytes_sent": network.bytes_sent,
            "bytes_recv": network.bytes_recv
        }
        
        # Process count
        process_count = len(psutil.pids())
        
        # GPU metrics (if available)
        gpu_usage = None
        gpu_memory = None
        try:
            import GPUtil
            gpus = GPUtil.getGPUs()
            if gpus:
                gpu = gpus[0]
                gpu_usage = gpu.load * 100
                gpu_memory = gpu.memoryUtil * 100
        except ImportError:
            pass
        
        metrics = SystemMetrics(
            timestamp=datetime.now(),
            cpu_usage=cpu_usage,
            memory_usage=memory.percent,
            disk_usage=disk.percent,
            gpu_usage=gpu_usage,
            gpu_memory=gpu_memory,
            network_io=network_io,
            process_count=process_count
        )
        
        # Store in history (keep last 100 entries)
        self.metrics_history.append(metrics)
        if len(self.metrics_history) > 100:
            self.metrics_history.pop(0)
        
        return metrics
    
    async def check_service_health(self, service_name: str, url: str, timeout: int = 5) -> ServiceHealth:
        """Check health of a specific service"""
        
        start_time = time.time()
        
        try:
            response = requests.get(url, timeout=timeout)
            response_time = time.time() - start_time
            
            if response.status_code == 200:
                status = "healthy"
                error_message = None
            else:
                status = "degraded"
                error_message = f"HTTP {response.status_code}"
                
        except requests.exceptions.Timeout:
            response_time = timeout
            status = "unhealthy"
            error_message = "Request timeout"
            
        except requests.exceptions.ConnectionError:
            response_time = None
            status = "unhealthy"
            error_message = "Connection failed"
            
        except Exception as e:
            response_time = None
            status = "unhealthy"
            error_message = str(e)
        
        health = ServiceHealth(
            service_name=service_name,
            status=status,
            response_time=response_time,
            last_check=datetime.now(),
            error_message=error_message,
            uptime=None  # Could be calculated from service start time
        )
        
        self.service_health[service_name] = health
        return health
    
    async def check_model_health(self, model_name: str, test_query: str, category: str) -> ModelHealth:
        """Check health of AI models"""
        
        start_time = time.time()
        
        try:
            response = requests.post(
                "http://localhost:8000/api/v1/chat/chat",
                json={
                    "message": test_query,
                    "model_category": category,
                    "ai_mode": "tutor"
                },
                timeout=30
            )
            
            response_time = time.time() - start_time
            
            if response.status_code == 200:
                data = response.json()
                if data.get("model_used") == model_name and len(data.get("response", "")) > 10:
                    status = "healthy"
                    success = True
                else:
                    status = "degraded"
                    success = False
            else:
                status = "unhealthy"
                success = False
                
        except Exception as e:
            response_time = 30.0
            status = "unhealthy"
            success = False
            logger.error(f"Model health check failed for {model_name}: {e}")
        
        # Update model health record
        if model_name in self.model_health:
            health = self.model_health[model_name]
            total = health.total_requests
            health.avg_response_time = (health.avg_response_time * total + response_time) / (total + 1)
            health.total_requests += 1
            health.last_request = datetime.now()
            
            if success:
                health.success_rate = (health.success_rate * total + 100) / (total + 1)
            else:
                health.success_rate = (health.success_rate * total) / (total + 1)
                health.error_count += 1
            
            health.status = status
        else:
            health = ModelHealth(
                model_name=model_name,
                status=status,
                avg_response_time=response_time,
                success_rate=100.0 if success else 0.0,
                last_request=datetime.now(),
                error_count=0 if success else 1,
                total_requests=1
            )
            self.model_health[model_name] = health
        
        return health
    
    def check_alerts(self) -> List[Dict[str, Any]]:
        """Check for system alerts based on metrics and health"""
        
        current_alerts = []
        
        if self.metrics_history:
            latest_metrics = self.metrics_history[-1]
            
            # CPU alert
            if latest_metrics.cpu_usage > 80:
                current_alerts.append({
                    "type": "cpu_high",
                    "severity": "warning",
                    "message": f"High CPU usage: {latest_metrics.cpu_usage:.1f}%",
                    "timestamp": latest_metrics.timestamp.isoformat()
                })
            
            # Memory alert
            if latest_metrics.memory_usage > 85:
                current_alerts.append({
                    "type": "memory_high",
                    "severity": "warning",
                    "message": f"High memory usage: {latest_metrics.memory_usage:.1f}%",
                    "timestamp": latest_metrics.timestamp.isoformat()
                })
            
            # Disk alert
            if latest_metrics.disk_usage > 90:
                current_alerts.append({
                    "type": "disk_high",
                    "severity": "critical",
                    "message": f"High disk usage: {latest_metrics.disk_usage:.1f}%",
                    "timestamp": latest_metrics.timestamp.isoformat()
                })
            
            # GPU alerts
            if latest_metrics.gpu_memory and latest_metrics.gpu_memory > 90:
                current_alerts.append({
                    "type": "gpu_memory_high",
                    "severity": "warning",
                    "message": f"High GPU memory usage: {latest_metrics.gpu_memory:.1f}%",
                    "timestamp": latest_metrics.timestamp.isoformat()
                })
        
        # Service health alerts
        for service_name, health in self.service_health.items():
            if health.status == "unhealthy":
                current_alerts.append({
                    "type": "service_down",
                    "severity": "critical",
                    "message": f"Service {service_name} is unhealthy: {health.error_message}",
                    "timestamp": health.last_check.isoformat()
                })
            elif health.status == "degraded":
                current_alerts.append({
                    "type": "service_degraded",
                    "severity": "warning",
                    "message": f"Service {service_name} is degraded: {health.error_message}",
                    "timestamp": health.last_check.isoformat()
                })
        
        # Model health alerts
        for model_name, health in self.model_health.items():
            if health.success_rate < 80:
                current_alerts.append({
                    "type": "model_low_success",
                    "severity": "warning",
                    "message": f"Model {model_name} has low success rate: {health.success_rate:.1f}%",
                    "timestamp": health.last_request.isoformat() if health.last_request else datetime.now().isoformat()
                })
            
            if health.avg_response_time > 30:
                current_alerts.append({
                    "type": "model_slow_response",
                    "severity": "warning",
                    "message": f"Model {model_name} has slow response time: {health.avg_response_time:.1f}s",
                    "timestamp": health.last_request.isoformat() if health.last_request else datetime.now().isoformat()
                })
        
        self.alerts = current_alerts
        return current_alerts
    
    def get_health_summary(self) -> Dict[str, Any]:
        """Get comprehensive health summary"""
        
        # Overall system status
        overall_status = "healthy"
        
        # Check service health
        unhealthy_services = [name for name, health in self.service_health.items() if health.status == "unhealthy"]
        degraded_services = [name for name, health in self.service_health.items() if health.status == "degraded"]
        
        if unhealthy_services:
            overall_status = "unhealthy"
        elif degraded_services:
            overall_status = "degraded"
        
        # Check model health
        unhealthy_models = [name for name, health in self.model_health.items() if health.status == "unhealthy"]
        if unhealthy_models:
            overall_status = "unhealthy"
        
        # Latest metrics
        latest_metrics = self.metrics_history[-1] if self.metrics_history else None
        
        return {
            "overall_status": overall_status,
            "timestamp": datetime.now().isoformat(),
            "system_metrics": asdict(latest_metrics) if latest_metrics else None,
            "services": {name: asdict(health) for name, health in self.service_health.items()},
            "models": {name: asdict(health) for name, health in self.model_health.items()},
            "alerts": self.alerts,
            "summary": {
                "total_services": len(self.service_health),
                "healthy_services": len([h for h in self.service_health.values() if h.status == "healthy"]),
                "total_models": len(self.model_health),
                "healthy_models": len([h for h in self.model_health.values() if h.status == "healthy"]),
                "active_alerts": len(self.alerts)
            }
        }

async def run_comprehensive_health_check():
    """Run comprehensive health check"""
    
    print("COMPREHENSIVE SYSTEM HEALTH CHECK")
    print("=" * 60)
    print(f"Date: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    print("=" * 60 + "\n")
    
    monitor = SystemMonitor()
    
    # Collect system metrics
    print("📊 Collecting system metrics...")
    metrics = monitor.collect_system_metrics()
    print(f"✅ CPU: {metrics.cpu_usage:.1f}%, Memory: {metrics.memory_usage:.1f}%, Disk: {metrics.disk_usage:.1f}%")
    if metrics.gpu_usage is not None:
        print(f"✅ GPU: {metrics.gpu_usage:.1f}%, GPU Memory: {metrics.gpu_memory:.1f}%")
    
    # Check service health
    print("\n🔍 Checking service health...")
    services_to_check = [
        ("backend_api", "http://localhost:8000/health"),
        ("ollama_service", "http://localhost:11434/api/tags")
    ]
    
    for service_name, url in services_to_check:
        health = await monitor.check_service_health(service_name, url)
        status_icon = "✅" if health.status == "healthy" else "⚠️" if health.status == "degraded" else "❌"
        print(f"{status_icon} {service_name}: {health.status}")
        if health.response_time:
            print(f"   Response time: {health.response_time:.3f}s")
        if health.error_message:
            print(f"   Error: {health.error_message}")
    
    # Check model health
    print("\n🤖 Checking AI model health...")
    models_to_check = [
        ("phi3:mini", "Solve: x + 1 = 2", "math"),
        ("llama3.2:3b", "বাংলা কি?", "bangla"),
        ("llama3.2:1b", "What is science?", "general")
    ]
    
    for model_name, test_query, category in models_to_check:
        print(f"Testing {model_name}...")
        health = await monitor.check_model_health(model_name, test_query, category)
        status_icon = "✅" if health.status == "healthy" else "⚠️" if health.status == "degraded" else "❌"
        print(f"{status_icon} {model_name}: {health.status}")
        print(f"   Response time: {health.avg_response_time:.1f}s")
        print(f"   Success rate: {health.success_rate:.1f}%")
    
    # Check for alerts
    print("\n🚨 Checking for alerts...")
    alerts = monitor.check_alerts()
    if alerts:
        for alert in alerts:
            severity_icon = "🔴" if alert["severity"] == "critical" else "🟡"
            print(f"{severity_icon} {alert['type']}: {alert['message']}")
    else:
        print("✅ No alerts detected")
    
    # Generate health summary
    print("\n📋 Health Summary:")
    summary = monitor.get_health_summary()
    
    overall_icon = "✅" if summary["overall_status"] == "healthy" else "⚠️" if summary["overall_status"] == "degraded" else "❌"
    print(f"{overall_icon} Overall Status: {summary['overall_status'].upper()}")
    print(f"📊 Services: {summary['summary']['healthy_services']}/{summary['summary']['total_services']} healthy")
    print(f"🤖 Models: {summary['summary']['healthy_models']}/{summary['summary']['total_models']} healthy")
    print(f"🚨 Active Alerts: {summary['summary']['active_alerts']}")
    
    # Save detailed report
    with open("SYSTEM_HEALTH_REPORT.json", "w") as f:
        # Convert datetime objects to strings for JSON serialization
        def datetime_converter(obj):
            if isinstance(obj, datetime):
                return obj.isoformat()
            raise TypeError(f"Object of type {type(obj)} is not JSON serializable")
        
        json.dump(summary, f, indent=2, default=datetime_converter)
    
    print(f"\n📄 Detailed report saved to SYSTEM_HEALTH_REPORT.json")
    print("=" * 60)
    print("✅ COMPREHENSIVE HEALTH CHECK COMPLETE!")
    print("=" * 60)

if __name__ == "__main__":
    asyncio.run(run_comprehensive_health_check())