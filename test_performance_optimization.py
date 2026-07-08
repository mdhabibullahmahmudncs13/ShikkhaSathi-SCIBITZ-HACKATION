#!/usr/bin/env python3
"""
Performance Optimization Test Suite
Tests response times and identifies bottlenecks
"""

import requests
import json
import time
import statistics
from datetime import datetime
from concurrent.futures import ThreadPoolExecutor, as_completed

def test_response_times():
    """Test response times for different model categories"""
    
    print("\n" + "="*70)
    print("PERFORMANCE OPTIMIZATION TEST SUITE")
    print("="*70)
    print(f"Date: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    print("="*70 + "\n")
    
    base_url = "http://localhost:8000"
    
    # Test cases for different model categories
    test_cases = [
        {
            "category": "math",
            "message": "Solve: x + 2 = 5",
            "expected_model": "phi3:mini",
            "target_time": 15.0  # seconds
        },
        {
            "category": "bangla",
            "message": "বাংলা ভাষা কি?",
            "expected_model": "llama3.2:3b",
            "target_time": 10.0
        },
        {
            "category": "general",
            "message": "What is water?",
            "expected_model": "llama3.2:1b",
            "target_time": 8.0
        }
    ]
    
    results = {}
    
    for test_case in test_cases:
        category = test_case["category"]
        print(f"Testing {category.upper()} model performance...")
        
        times = []
        successes = 0
        
        # Run 3 tests for each category
        for i in range(3):
            try:
                start_time = time.time()
                response = requests.post(
                    f"{base_url}/api/v1/chat/chat",
                    json={
                        "message": test_case["message"],
                        "model_category": category,
                        "ai_mode": "tutor"
                    },
                    timeout=30
                )
                end_time = time.time()
                
                response_time = end_time - start_time
                times.append(response_time)
                
                if response.status_code == 200:
                    data = response.json()
                    model_used = data.get("model_used", "unknown")
                    
                    if model_used == test_case["expected_model"]:
                        successes += 1
                        print(f"  Test {i+1}: ✅ {response_time:.1f}s ({model_used})")
                    else:
                        print(f"  Test {i+1}: ❌ Wrong model: {model_used}")
                else:
                    print(f"  Test {i+1}: ❌ HTTP {response.status_code}")
                    
            except requests.exceptions.Timeout:
                print(f"  Test {i+1}: ⏰ Timeout (>30s)")
                times.append(30.0)  # Record as 30s for timeout
            except Exception as e:
                print(f"  Test {i+1}: ❌ Error: {str(e)}")
        
        if times:
            avg_time = statistics.mean(times)
            min_time = min(times)
            max_time = max(times)
            target_time = test_case["target_time"]
            
            performance_score = min(100, (target_time / avg_time) * 100) if avg_time > 0 else 0
            
            results[category] = {
                "avg_time": avg_time,
                "min_time": min_time,
                "max_time": max_time,
                "target_time": target_time,
                "performance_score": performance_score,
                "success_rate": (successes / 3) * 100,
                "model": test_case["expected_model"]
            }
            
            status = "✅" if avg_time <= target_time else "⚠️" if avg_time <= target_time * 1.5 else "❌"
            
            print(f"  Results: {status}")
            print(f"    Average: {avg_time:.1f}s (target: {target_time}s)")
            print(f"    Range: {min_time:.1f}s - {max_time:.1f}s")
            print(f"    Performance: {performance_score:.1f}%")
            print(f"    Success rate: {(successes/3)*100:.1f}%")
        
        print("-" * 70)
    
    return results

def test_concurrent_requests():
    """Test how the system handles concurrent requests"""
    
    print("CONCURRENT REQUEST TEST")
    print("=" * 70)
    
    base_url = "http://localhost:8000"
    
    def make_request(request_id):
        try:
            start_time = time.time()
            response = requests.post(
                f"{base_url}/api/v1/chat/chat",
                json={
                    "message": f"What is {request_id + 1} + 1?",
                    "model_category": "math",
                    "ai_mode": "tutor"
                },
                timeout=45
            )
            end_time = time.time()
            
            return {
                "id": request_id,
                "success": response.status_code == 200,
                "time": end_time - start_time,
                "status_code": response.status_code
            }
        except Exception as e:
            return {
                "id": request_id,
                "success": False,
                "time": 45.0,
                "error": str(e)
            }
    
    # Test with 3 concurrent requests
    print("Testing 3 concurrent math requests...")
    
    with ThreadPoolExecutor(max_workers=3) as executor:
        futures = [executor.submit(make_request, i) for i in range(3)]
        results = []
        
        for future in as_completed(futures):
            result = future.result()
            results.append(result)
            
            status = "✅" if result["success"] else "❌"
            print(f"  Request {result['id']+1}: {status} {result['time']:.1f}s")
    
    if results:
        successful = sum(1 for r in results if r["success"])
        avg_time = statistics.mean([r["time"] for r in results])
        
        print(f"\nConcurrent Results:")
        print(f"  Success rate: {(successful/len(results))*100:.1f}%")
        print(f"  Average time: {avg_time:.1f}s")
        
        if successful == len(results) and avg_time < 30:
            print("  ✅ Concurrent handling: GOOD")
        else:
            print("  ⚠️ Concurrent handling: NEEDS IMPROVEMENT")
    
    print("=" * 70)

def test_rag_performance():
    """Test RAG system performance"""
    
    print("RAG SYSTEM PERFORMANCE TEST")
    print("=" * 70)
    
    try:
        from backend.app.services.rag.rag_service import get_rag_service
        rag_service = get_rag_service()
        
        if not rag_service:
            print("❌ RAG service not available")
            return
        
        # Test different types of queries
        queries = [
            ("Mathematics", "solve equation"),
            ("Bangla", "বাংলা ব্যাকরণ"),
            ("Physics", "photosynthesis"),
            ("General", "what is science")
        ]
        
        times = []
        
        for subject, query in queries:
            print(f"Testing RAG search: '{query}' (subject: {subject})")
            
            try:
                start_time = time.time()
                results = rag_service.search_similar(
                    query=query,
                    n_results=3,
                    subject_filter=subject if subject != "General" else None
                )
                end_time = time.time()
                
                search_time = end_time - start_time
                times.append(search_time)
                
                print(f"  ✅ Found {len(results)} documents in {search_time:.3f}s")
                
            except Exception as e:
                print(f"  ❌ Error: {str(e)}")
        
        if times:
            avg_time = statistics.mean(times)
            print(f"\nRAG Performance Summary:")
            print(f"  Average search time: {avg_time:.3f}s")
            print(f"  Target: <0.5s")
            
            if avg_time < 0.5:
                print("  ✅ RAG performance: EXCELLENT")
            elif avg_time < 1.0:
                print("  ✅ RAG performance: GOOD")
            else:
                print("  ⚠️ RAG performance: NEEDS OPTIMIZATION")
    
    except ImportError:
        print("❌ Cannot import RAG service")
    except Exception as e:
        print(f"❌ RAG test failed: {str(e)}")
    
    print("=" * 70)

def generate_optimization_recommendations(results):
    """Generate optimization recommendations based on test results"""
    
    print("OPTIMIZATION RECOMMENDATIONS")
    print("=" * 70)
    
    recommendations = []
    
    # Check model performance
    for category, data in results.items():
        if data["avg_time"] > data["target_time"] * 1.5:
            recommendations.append(
                f"🔧 {category.upper()} model ({data['model']}) is slow "
                f"({data['avg_time']:.1f}s vs {data['target_time']}s target). "
                f"Consider model optimization or hardware upgrade."
            )
        elif data["success_rate"] < 100:
            recommendations.append(
                f"⚠️ {category.upper()} model has reliability issues "
                f"({data['success_rate']:.1f}% success rate). Check error handling."
            )
    
    # General recommendations
    recommendations.extend([
        "💡 Consider implementing response caching for common queries",
        "💡 Add model warm-up on startup to reduce first-request latency",
        "💡 Implement request queuing for better concurrent handling",
        "💡 Monitor GPU memory usage during peak loads",
        "💡 Add response streaming for better user experience"
    ])
    
    for i, rec in enumerate(recommendations, 1):
        print(f"{i}. {rec}")
    
    print("=" * 70)

if __name__ == "__main__":
    # Test individual model performance
    performance_results = test_response_times()
    
    # Test concurrent handling
    test_concurrent_requests()
    
    # Test RAG performance
    test_rag_performance()
    
    # Generate recommendations
    if performance_results:
        generate_optimization_recommendations(performance_results)
    
    print(f"\n🎯 PERFORMANCE TESTING COMPLETE")
    print(f"📊 Use results to optimize system performance")