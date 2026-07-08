#!/usr/bin/env python3
"""
Comprehensive Test Suite for ShikkhaSathi Ollama Multi-Model Setup
Tests all models, RAG system, and backend integration
"""

import asyncio
import sys
import time
import json
from datetime import datetime

sys.path.insert(0, 'backend')

# Color codes for output
GREEN = '\033[92m'
RED = '\033[91m'
YELLOW = '\033[93m'
BLUE = '\033[94m'
RESET = '\033[0m'

try:
    from langchain_ollama import ChatOllama
    from app.services.rag.rag_service import get_rag_service
    LANGCHAIN_AVAILABLE = True
except ImportError as e:
    print(f"{RED}❌ Import failed: {e}{RESET}")
    LANGCHAIN_AVAILABLE = False
    sys.exit(1)

class TestResults:
    def __init__(self):
        self.total = 0
        self.passed = 0
        self.failed = 0
        self.warnings = 0
        self.tests = []
    
    def add_test(self, name, status, details="", duration=0):
        self.total += 1
        if status == "PASS":
            self.passed += 1
        elif status == "FAIL":
            self.failed += 1
        elif status == "WARN":
            self.warnings += 1
        
        self.tests.append({
            "name": name,
            "status": status,
            "details": details,
            "duration": duration
        })
    
    def print_summary(self):
        print(f"\n{'='*70}")
        print(f"{BLUE}TEST SUMMARY{RESET}")
        print(f"{'='*70}")
        print(f"Total Tests:    {self.total}")
        print(f"{GREEN}Passed:         {self.passed}{RESET}")
        print(f"{RED}Failed:         {self.failed}{RESET}")
        print(f"{YELLOW}Warnings:       {self.warnings}{RESET}")
        print(f"Success Rate:   {(self.passed/self.total*100):.1f}%")
        print(f"{'='*70}\n")

results = TestResults()

async def test_ollama_connectivity():
    """Test 1: Ollama Service Connectivity"""
    print(f"\n{BLUE}Test 1: Ollama Service Connectivity{RESET}")
    start = time.time()
    
    try:
        import requests
        response = requests.get("http://localhost:11434/api/tags", timeout=5)
        
        if response.status_code == 200:
            data = response.json()
            models = [m['name'] for m in data.get('models', [])]
            duration = time.time() - start
            
            print(f"{GREEN}✅ Ollama service is running{RESET}")
            print(f"   Available models: {len(models)}")
            print(f"   Response time: {duration*1000:.0f}ms")
            
            results.add_test("Ollama Connectivity", "PASS", 
                           f"{len(models)} models available", duration)
            return True
        else:
            duration = time.time() - start
            print(f"{RED}❌ Ollama returned status {response.status_code}{RESET}")
            results.add_test("Ollama Connectivity", "FAIL", 
                           f"Status {response.status_code}", duration)
            return False
            
    except Exception as e:
        duration = time.time() - start
        print(f"{RED}❌ Failed to connect to Ollama: {e}{RESET}")
        results.add_test("Ollama Connectivity", "FAIL", str(e), duration)
        return False

async def test_model(model_name, purpose, test_query, expected_keywords=None):
    """Test individual model"""
    print(f"\n{BLUE}Testing: {model_name} ({purpose}){RESET}")
    start = time.time()
    
    try:
        model = ChatOllama(model=model_name, temperature=0.7)
        response = await model.ainvoke(test_query)
        duration = time.time() - start
        
        response_text = response.content
        response_length = len(response_text)
        
        # Check if response is meaningful
        if response_length < 20:
            print(f"{YELLOW}⚠️  Response too short ({response_length} chars){RESET}")
            results.add_test(f"Model: {model_name}", "WARN", 
                           "Response too short", duration)
            return False
        
        # Check for expected keywords if provided
        keyword_found = True
        if expected_keywords:
            keyword_found = any(kw.lower() in response_text.lower() 
                              for kw in expected_keywords)
        
        print(f"{GREEN}✅ Model responding correctly{RESET}")
        print(f"   Query: {test_query[:50]}...")
        print(f"   Response length: {response_length} chars")
        print(f"   Response time: {duration*1000:.0f}ms")
        print(f"   Preview: {response_text[:100]}...")
        
        if not keyword_found and expected_keywords:
            print(f"{YELLOW}⚠️  Expected keywords not found: {expected_keywords}{RESET}")
            results.add_test(f"Model: {model_name}", "WARN", 
                           "Keywords missing", duration)
        else:
            results.add_test(f"Model: {model_name}", "PASS", 
                           f"{response_length} chars", duration)
        
        return True
        
    except Exception as e:
        duration = time.time() - start
        print(f"{RED}❌ Model test failed: {e}{RESET}")
        results.add_test(f"Model: {model_name}", "FAIL", str(e), duration)
        return False

async def test_rag_system():
    """Test RAG system"""
    print(f"\n{BLUE}Test: RAG System{RESET}")
    start = time.time()
    
    try:
        rag = get_rag_service()
        
        if rag is None:
            print(f"{RED}❌ RAG service not initialized{RESET}")
            results.add_test("RAG Initialization", "FAIL", "Service is None", 0)
            return False
        
        # Get collection stats
        stats = rag.get_collection_stats()
        doc_count = stats.get('document_count', 0)
        
        print(f"{GREEN}✅ RAG service initialized{RESET}")
        print(f"   Collection: {stats.get('collection_name', 'unknown')}")
        print(f"   Documents: {doc_count}")
        
        if doc_count == 0:
            print(f"{RED}❌ No documents in collection{RESET}")
            results.add_test("RAG Initialization", "FAIL", "No documents", 0)
            return False
        
        results.add_test("RAG Initialization", "PASS", 
                       f"{doc_count} documents", time.time() - start)
        
        # Test searches
        test_queries = [
            ("What is photosynthesis?", None, ["photo", "plant", "light"]),
            ("Solve x + 5 = 12", "Mathematics", ["x", "7", "solve"]),
            ("বাংলা ব্যাকরণ কি?", "Bangla", ["বাংলা", "ব্যাকরণ"])
        ]
        
        for query, subject_filter, keywords in test_queries:
            search_start = time.time()
            
            print(f"\n   Searching: {query[:40]}...")
            if subject_filter:
                print(f"   Filter: {subject_filter}")
            
            search_results = await rag.search_similar(
                query=query,
                n_results=3,
                subject_filter=subject_filter
            )
            
            search_duration = time.time() - search_start
            
            if search_results:
                print(f"{GREEN}   ✅ Found {len(search_results)} documents{RESET}")
                print(f"   Search time: {search_duration*1000:.0f}ms")
                
                # Show first result
                first = search_results[0]
                print(f"   Subject: {first['metadata'].get('subject', 'Unknown')}")
                print(f"   Distance: {first.get('distance', 'N/A'):.4f}")
                
                results.add_test(f"RAG Search: {query[:30]}", "PASS", 
                               f"{len(search_results)} docs", search_duration)
            else:
                print(f"{RED}   ❌ No results found{RESET}")
                results.add_test(f"RAG Search: {query[:30]}", "FAIL", 
                               "No results", search_duration)
        
        return True
        
    except Exception as e:
        duration = time.time() - start
        print(f"{RED}❌ RAG test failed: {e}{RESET}")
        results.add_test("RAG System", "FAIL", str(e), duration)
        return False

async def test_backend_integration():
    """Test backend API integration"""
    print(f"\n{BLUE}Test: Backend API Integration{RESET}")
    
    try:
        import requests
        
        # Test health endpoint
        print(f"\n   Testing health endpoint...")
        start = time.time()
        response = requests.get("http://localhost:8000/health", timeout=5)
        duration = time.time() - start
        
        if response.status_code == 200:
            print(f"{GREEN}   ✅ Health endpoint OK{RESET}")
            print(f"   Response time: {duration*1000:.0f}ms")
            results.add_test("Backend Health", "PASS", "OK", duration)
        else:
            print(f"{RED}   ❌ Health endpoint failed{RESET}")
            results.add_test("Backend Health", "FAIL", 
                           f"Status {response.status_code}", duration)
            return False
        
        # Test AI chat endpoints
        test_cases = [
            {
                "name": "General Science",
                "data": {
                    "message": "What is photosynthesis?",
                    "model_category": "general",
                    "ai_mode": "tutor",
                    "conversation_history": []
                }
            },
            {
                "name": "Mathematics",
                "data": {
                    "message": "Solve: 2x + 5 = 15",
                    "model_category": "math",
                    "ai_mode": "tutor",
                    "conversation_history": []
                }
            },
            {
                "name": "Bangla",
                "data": {
                    "message": "বাংলা ব্যাকরণ কি?",
                    "model_category": "bangla",
                    "ai_mode": "tutor",
                    "conversation_history": []
                }
            }
        ]
        
        for test_case in test_cases:
            print(f"\n   Testing {test_case['name']}...")
            start = time.time()
            
            response = requests.post(
                "http://localhost:8000/api/v1/chat/chat",
                json=test_case['data'],
                headers={"Content-Type": "application/json"},
                timeout=30
            )
            
            duration = time.time() - start
            
            if response.status_code == 200:
                data = response.json()
                response_text = data.get('response', '')
                has_rag = data.get('has_rag_context', False)
                
                print(f"{GREEN}   ✅ {test_case['name']} endpoint OK{RESET}")
                print(f"   Response length: {len(response_text)} chars")
                print(f"   RAG context: {'Yes' if has_rag else 'No'}")
                print(f"   Response time: {duration*1000:.0f}ms")
                
                results.add_test(f"API: {test_case['name']}", "PASS", 
                               f"{len(response_text)} chars", duration)
            else:
                print(f"{RED}   ❌ {test_case['name']} failed{RESET}")
                results.add_test(f"API: {test_case['name']}", "FAIL", 
                               f"Status {response.status_code}", duration)
        
        return True
        
    except Exception as e:
        print(f"{RED}❌ Backend test failed: {e}{RESET}")
        results.add_test("Backend Integration", "FAIL", str(e), 0)
        return False

async def test_performance():
    """Test performance metrics"""
    print(f"\n{BLUE}Test: Performance Metrics{RESET}")
    
    try:
        # Test embedding generation speed
        print(f"\n   Testing embedding generation...")
        rag = get_rag_service()
        
        test_texts = [
            "This is a test sentence for embedding generation.",
            "Another test to measure performance.",
            "Third test for averaging results."
        ]
        
        times = []
        for text in test_texts:
            start = time.time()
            embedding = rag.embeddings.embed_query(text)
            duration = time.time() - start
            times.append(duration)
        
        avg_time = sum(times) / len(times)
        print(f"{GREEN}   ✅ Embedding generation{RESET}")
        print(f"   Average time: {avg_time*1000:.0f}ms")
        print(f"   Dimension: {len(embedding)}")
        
        if avg_time < 0.2:  # Under 200ms
            results.add_test("Performance: Embeddings", "PASS", 
                           f"{avg_time*1000:.0f}ms", avg_time)
        else:
            results.add_test("Performance: Embeddings", "WARN", 
                           f"{avg_time*1000:.0f}ms (slow)", avg_time)
        
        # Test model response speed
        print(f"\n   Testing model response speed...")
        model = ChatOllama(model="llama3.2:1b", temperature=0.7)
        
        start = time.time()
        response = await model.ainvoke("Hello, respond with OK.")
        duration = time.time() - start
        
        print(f"{GREEN}   ✅ Model response{RESET}")
        print(f"   Response time: {duration*1000:.0f}ms")
        
        if duration < 1.0:  # Under 1 second
            results.add_test("Performance: Model Speed", "PASS", 
                           f"{duration*1000:.0f}ms", duration)
        else:
            results.add_test("Performance: Model Speed", "WARN", 
                           f"{duration*1000:.0f}ms (slow)", duration)
        
        return True
        
    except Exception as e:
        print(f"{RED}❌ Performance test failed: {e}{RESET}")
        results.add_test("Performance Tests", "FAIL", str(e), 0)
        return False

async def main():
    """Run all tests"""
    print(f"\n{'='*70}")
    print(f"{BLUE}COMPREHENSIVE TEST SUITE - SHIKKHASATHI OLLAMA SETUP{RESET}")
    print(f"{'='*70}")
    print(f"Date: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    print(f"{'='*70}\n")
    
    # Test 1: Ollama Connectivity
    await test_ollama_connectivity()
    
    # Test 2-4: Individual Models
    await test_model(
        "llama3.2:1b",
        "General subjects",
        "Explain photosynthesis in simple terms.",
        ["plant", "light", "photo"]
    )
    
    await test_model(
        "llama3.2:3b",
        "Bangla language",
        "বাংলা ব্যাকরণে সন্ধি কি? সংক্ষেপে ব্যাখ্যা করুন।",
        ["বাংলা", "সন্ধি"]
    )
    
    await test_model(
        "phi3:mini",
        "Mathematics",
        "Solve: If x + 5 = 12, what is x? Show steps.",
        ["x", "7", "step"]
    )
    
    # Test 5: RAG System
    await test_rag_system()
    
    # Test 6: Backend Integration
    await test_backend_integration()
    
    # Test 7: Performance
    await test_performance()
    
    # Print summary
    results.print_summary()
    
    # Print detailed results
    print(f"{BLUE}DETAILED TEST RESULTS{RESET}")
    print(f"{'='*70}")
    for test in results.tests:
        status_color = GREEN if test['status'] == 'PASS' else (YELLOW if test['status'] == 'WARN' else RED)
        status_icon = '✅' if test['status'] == 'PASS' else ('⚠️' if test['status'] == 'WARN' else '❌')
        
        print(f"{status_color}{status_icon} {test['name']}{RESET}")
        if test['details']:
            print(f"   Details: {test['details']}")
        if test['duration'] > 0:
            print(f"   Duration: {test['duration']*1000:.0f}ms")
    
    print(f"{'='*70}\n")
    
    # Final verdict
    if results.failed == 0:
        print(f"{GREEN}{'='*70}")
        print(f"✅ ALL TESTS PASSED! System is fully operational.")
        print(f"{'='*70}{RESET}\n")
        return 0
    else:
        print(f"{RED}{'='*70}")
        print(f"❌ {results.failed} TEST(S) FAILED. Please review errors above.")
        print(f"{'='*70}{RESET}\n")
        return 1

if __name__ == "__main__":
    exit_code = asyncio.run(main())
    sys.exit(exit_code)
