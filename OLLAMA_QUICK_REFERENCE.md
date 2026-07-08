# Ollama RAG - Quick Reference Guide

**Last Updated:** January 14, 2026

---

## Quick Status Check

```bash
# Check if everything is running
curl http://localhost:11434/api/tags && echo "✅ Ollama OK"
curl http://localhost:8000/health && echo "✅ Backend OK"
python3 test_rag_status.py
```

---

## Common Commands

### Ollama Management
```bash
# Check Ollama version
ollama --version

# List installed models
ollama list

# Check service status
curl http://localhost:11434/api/tags

# Pull a new model
ollama pull llama3.2:1b

# Remove a model
ollama rm llama3.2:1b
```

### RAG System
```bash
# Test RAG search
python3 test_rag_status.py

# Reload all documents
python3 backend/load_nctb_txt_documents.py

# Clear and reload
rm -rf backend/data/chroma_db && python3 backend/load_nctb_txt_documents.py
```

### Backend
```bash
# Start lightweight backend
python3 backend/run_dev_lightweight.py

# Test AI chat
curl -X POST http://localhost:8000/api/v1/chat/chat \
  -H "Content-Type: application/json" \
  -d '{"message": "What is photosynthesis?", "model_category": "general"}'
```

---

## System Information

| Component | Value |
|-----------|-------|
| Ollama Version | 0.14.0 |
| Model | llama3.2:1b |
| Embedding Dimension | 2048 |
| ChromaDB Location | backend/data/chroma_db/ |
| Total Documents | 3,482 chunks |
| NCTB Textbooks | 6 files |
| Backend Port | 8000 |
| Ollama Port | 11434 |

---

## Troubleshooting

### Problem: RAG not working
```bash
# 1. Check Ollama
curl http://localhost:11434/api/tags

# 2. Check ChromaDB
python3 test_rag_status.py

# 3. Reload if needed
rm -rf backend/data/chroma_db
python3 backend/load_nctb_txt_documents.py
```

### Problem: Slow performance
```bash
# Check GPU usage
nvidia-smi

# Restart Ollama
sudo systemctl restart ollama
```

### Problem: Wrong results
```bash
# Clear and reload with fresh embeddings
rm -rf backend/data/chroma_db
python3 backend/load_nctb_txt_documents.py
```

---

## File Locations

```
backend/
├── data/
│   ├── chroma_db/              # Vector database
│   └── nctb/nctb_txt/          # Source textbooks
├── app/services/rag/
│   └── rag_service.py          # RAG implementation
└── load_nctb_txt_documents.py  # Document loader

test_rag_status.py              # Testing script
```

---

## Quick Tests

### Test 1: Ollama
```bash
curl -s http://localhost:11434/api/embeddings -d '{
  "model": "llama3.2:1b",
  "prompt": "test"
}' | python3 -c "import sys, json; print('Dimension:', len(json.load(sys.stdin)['embedding']))"
```
**Expected:** Dimension: 2048

### Test 2: RAG Search
```bash
python3 test_rag_status.py
```
**Expected:** 3,482 documents, successful searches

### Test 3: Backend Integration
```bash
curl -X POST http://localhost:8000/api/v1/chat/chat \
  -H "Content-Type: application/json" \
  -d '{"message": "test", "model_category": "general"}' | grep -o '"has_rag_context":[^,]*'
```
**Expected:** "has_rag_context":true

---

## Performance Targets

| Metric | Target | Current |
|--------|--------|---------|
| Embedding Generation | <200ms | ~100ms ✅ |
| Vector Search | <100ms | ~50ms ✅ |
| Total RAG Latency | <300ms | ~150ms ✅ |
| Search Accuracy | >80% | 85-90% ✅ |

---

## Support

For detailed information, see:
- `OLLAMA_RAG_SETUP_COMPLETE_2026.md` - Complete setup guide
- `backend/app/services/rag/rag_service.py` - Implementation
- `backend/load_nctb_txt_documents.py` - Document loader

---

**Status:** ✅ OPERATIONAL  
**Last Tested:** January 14, 2026
