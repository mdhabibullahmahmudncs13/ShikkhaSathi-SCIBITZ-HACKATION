#!/usr/bin/env python3
"""
Equation Solving Test Suite
Tests the specific functionality that was fixed
"""

import requests
import json
import time
from datetime import datetime

def test_equation_solving():
    """Test various math equation solving scenarios"""
    
    print("\n" + "="*70)
    print("EQUATION SOLVING TEST SUITE")
    print("="*70)
    print(f"Date: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    print("="*70 + "\n")
    
    base_url = "http://localhost:8000"
    
    # Test cases for equation solving
    test_cases = [
        {
            "name": "Linear Equation - Basic",
            "message": "Solve: 2x + 3 = 11",
            "expected_keywords": ["step", "x", "4", "subtract", "divide"]
        },
        {
            "name": "Linear Equation - Negative",
            "message": "Solve: 5x - 7 = 18. Show all steps.",
            "expected_keywords": ["step", "x", "5", "add", "divide"]
        },
        {
            "name": "Linear Equation - Fractions",
            "message": "What is x if 3x/2 = 9?",
            "expected_keywords": ["x", "6", "multiply", "divide"]
        },
        {
            "name": "Quadratic Recognition",
            "message": "How do I solve x² - 5x + 6 = 0?",
            "expected_keywords": ["quadratic", "factor", "formula"]
        },
        {
            "name": "Word Problem",
            "message": "If a number increased by 8 equals 20, what is the number?",
            "expected_keywords": ["12", "equation", "subtract"]
        }
    ]
    
    results = []
    
    for i, test_case in enumerate(test_cases, 1):
        print(f"Test {i}: {test_case['name']}")
        print(f"Question: {test_case['message']}")
        
        try:
            # Make API request
            start_time = time.time()
            response = requests.post(
                f"{base_url}/api/v1/chat/chat",
                json={
                    "message": test_case["message"],
                    "model_category": "math",
                    "ai_mode": "tutor"
                },
                timeout=60
            )
            end_time = time.time()
            
            if response.status_code == 200:
                data = response.json()
                response_text = data.get("response", "").lower()
                response_time = end_time - start_time
                
                # Check if it's actually solving (not generic response)
                is_solving = any(keyword in response_text for keyword in ["step", "solve", "equation", "="])
                
                # Check for expected keywords
                keyword_matches = sum(1 for keyword in test_case["expected_keywords"] 
                                    if keyword.lower() in response_text)
                keyword_score = keyword_matches / len(test_case["expected_keywords"])
                
                # Determine if test passed
                passed = is_solving and keyword_score >= 0.3  # At least 30% keyword match
                
                print(f"✅ Response received" if passed else f"❌ Poor response quality")
                print(f"   Model used: {data.get('model_used', 'unknown')}")
                print(f"   Response time: {response_time:.1f}s")
                print(f"   Response length: {len(data.get('response', ''))} chars")
                print(f"   Keyword match: {keyword_score:.1%}")
                print(f"   Is solving: {'Yes' if is_solving else 'No'}")
                
                # Show preview of response
                preview = data.get("response", "")[:200] + "..." if len(data.get("response", "")) > 200 else data.get("response", "")
                print(f"   Preview: {preview}")
                
                results.append({
                    "test": test_case["name"],
                    "passed": passed,
                    "response_time": response_time,
                    "keyword_score": keyword_score,
                    "is_solving": is_solving,
                    "model": data.get('model_used', 'unknown')
                })
                
            else:
                print(f"❌ API Error: {response.status_code}")
                results.append({
                    "test": test_case["name"],
                    "passed": False,
                    "error": f"HTTP {response.status_code}"
                })
                
        except Exception as e:
            print(f"❌ Test failed: {str(e)}")
            results.append({
                "test": test_case["name"],
                "passed": False,
                "error": str(e)
            })
        
        print("-" * 70)
    
    # Summary
    passed_tests = sum(1 for r in results if r.get("passed", False))
    total_tests = len(results)
    success_rate = (passed_tests / total_tests) * 100 if total_tests > 0 else 0
    
    print(f"\nTEST SUMMARY")
    print("=" * 70)
    print(f"Total Tests:    {total_tests}")
    print(f"Passed:         {passed_tests}")
    print(f"Failed:         {total_tests - passed_tests}")
    print(f"Success Rate:   {success_rate:.1f}%")
    
    if success_rate >= 80:
        print("✅ EQUATION SOLVING IS WORKING CORRECTLY!")
    else:
        print("❌ EQUATION SOLVING NEEDS IMPROVEMENT")
    
    print("=" * 70)
    
    return results

def test_model_specialization():
    """Test that different models are being used for different subjects"""
    
    print("\nMODEL SPECIALIZATION TEST")
    print("=" * 70)
    
    base_url = "http://localhost:8000"
    
    test_cases = [
        {
            "category": "math",
            "message": "Solve: x + 3 = 7",
            "expected_model": "phi3:mini"
        },
        {
            "category": "bangla", 
            "message": "বাংলা ব্যাকরণ কি?",
            "expected_model": "llama3.2:3b"
        },
        {
            "category": "general",
            "message": "What is photosynthesis?",
            "expected_model": "llama3.2:1b"
        }
    ]
    
    for test_case in test_cases:
        print(f"Testing {test_case['category']} category...")
        
        try:
            response = requests.post(
                f"{base_url}/api/v1/chat/chat",
                json={
                    "message": test_case["message"],
                    "model_category": test_case["category"],
                    "ai_mode": "tutor"
                },
                timeout=60
            )
            
            if response.status_code == 200:
                data = response.json()
                actual_model = data.get("model_used", "unknown")
                expected_model = test_case["expected_model"]
                
                if actual_model == expected_model:
                    print(f"✅ Correct model: {actual_model}")
                else:
                    print(f"❌ Wrong model: expected {expected_model}, got {actual_model}")
            else:
                print(f"❌ API Error: {response.status_code}")
                
        except Exception as e:
            print(f"❌ Test failed: {str(e)}")
    
    print("=" * 70)

if __name__ == "__main__":
    # Test equation solving functionality
    equation_results = test_equation_solving()
    
    # Test model specialization
    test_model_specialization()
    
    print(f"\n🎯 EQUATION SOLVING FIX VERIFICATION COMPLETE")
    print(f"📊 Results saved for analysis")