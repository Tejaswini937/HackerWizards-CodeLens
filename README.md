# CodeLens — Agentic Code Intelligence

CodeLens is an agentic code retrieval system that allows developers to ask questions about a codebase in natural language and retrieve ranked, relevant code snippets.

## Features

- Semantic code retrieval
- BM25 lexical retrieval
- Hybrid retrieval
- Agentic multi-pass retrieval
- Query refinement using retrieved evidence
- Candidate fusion and re-ranking
- File and function level results
- Retrieval trace for agentic search

## Architecture

Natural Language Query  
↓  
Query Analysis  
↓  
Semantic + BM25 Retrieval  
↓  
Hybrid Ranking  
↓  
Inspect Top Results  
↓  
Query Refinement  
↓  
Second Retrieval  
↓  
Merge + Re-rank  
↓  
Relevant Code

## Technology Stack

### Backend

- Python
- FastAPI
- NumPy

### Retrieval

- Sentence Transformers
- all-MiniLM-L6-v2
- BM25

### Frontend

- React
- Vite

## Running the Backend
## Submission Materials

All submission materials, including the demo video, presentation, AI disclosure, and project backup, are available here:

[Google Drive — CodeLens Submission Materials](https://drive.google.com/drive/folders/1MMbRShbDMuwzAcC61gWZuz7bEV_0gq2o)


```bash
cd backend
pip install -r requirements.txt

