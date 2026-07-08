#!/usr/bin/env python3
"""
Test RAG Search to verify documents are accessible
"""

import sys
import os
import asyncio

sys.path.append(os.path.join(os.path.dirname(__file__), 'backend'))

from backend.app.services.rag.rag_service import get_rag_service

async def test_rag_search():
    print("🔍 Testing RAG Search\n")
    
    rag_service = get_rag_service()
    
    if not rag_service:
        print("❌ RAG service not available")
        return
    
    # Get collection stats
    stats = rag_service.get_collection_stats()
    print(f"📊 Collection Stats:")
    print(f"   Documents: {stats.get('document_count', 0)}")
    print(f"   Collection: {stats.get('collection_name', 'N/A')}\n")
    
    if stats.get('document_count', 0) == 0:
        print("⚠️  No documents in collection. Run: python3 backend/load_nctb_txt_documents.py")
        return
    
    # Test searches
    test_queries = [
        ("mathematics algebra", None),
        ("ict e-book", None),
        ("physics motion", None),
        ("bangla grammar", None),
    ]
    
    for query, subject_filter in test_queries:
        print(f"🔎 Query: '{query}' (filter: {subject_filter})")
        
        results = await rag_service.search_similar(
            query=query,
            n_results=3,
            subject_filter=subject_filter
        )
        
        if results:
            print(f"   ✅ Found {len(results)} results")
            for i, result in enumerate(results, 1):
                metadata = result.get('metadata', {})
                content = result.get('content', '')[:100]
                print(f"   {i}. Subject: {metadata.get('subject', 'N/A')}")
                print(f"      Textbook: {metadata.get('textbook_name', 'N/A')}")
                print(f"      Content: {content}...\n")
        else:
            print(f"   ❌ No results found\n")

if __name__ == "__main__":
    asyncio.run(test_rag_search())
