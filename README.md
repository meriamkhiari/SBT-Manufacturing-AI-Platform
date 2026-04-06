# Smart Brain Technology (SBT) Vision Intelligence Hub

A professional-grade, multi-agent Quality Control (QC) Vision Pipeline designed for industrial electrical connector inspection and documentation extraction. Developed by the **Token Thieves** engineering students at **ESPRIT** (Class of 2026).

---

## 🚀 Project Overview

The SBT Vision Intelligence Hub is a comprehensive solution for managing and verifying electrical connector assembly lines. The platform is divided into three core pillars:

### 1. 📂 Connector Intake Pipeline (Part A)
A sophisticated extraction system that processes technical PDF documentation (Fiches d'assemblage).
- **Automated Extraction**: Uses `pdf.js` and LLM scoring to identify the best technical diagrams within complex PDFs.
- **Structural Mapping**: Identifies connector references (e.g., GRP-XXXXXX) and maps terminal cavity configurations (port numbers and expected wire colors).
- **Persistence**: Automatically stores technical specifications in MongoDB for real-time reference during inspection.

### 2. 🔍 Real-Time QC Conformity (Part B)
A live visual inspection system that ensures physical connectors match their technical blueprints.
- **Vision AI**: Leverages **Gemini 2.5 Flash** (VLM) to analyze live camera frames.
- **Dynamic Matching**: Compares the physical wire sequence against the stored reference from the database.
- **Orientation Normalization**: Algorithmic handling of camera mirroring and connector rotation (normal vs. reversed sequences).
- **Justification Engine**: Provides a detailed textual verdict for each inspection (OK/FAIL) based on specific visual evidence.

### 3. 📈 Marketing & Branding Hub
A professional-grade dashboard designed for industrial monitoring and stakeholder reporting.
- **Corporate UI**: Modern, responsive interface with Dark/Light mode support and SBT branding.
- **System History Agent**: A dedicated background agent that tracks every user action, page view, and configuration change with precise timestamps for audit logs.
- **Actionable Metrics**: Real-time tracking of AI latency, API costs, and matching confidence scores.

---

## 🛠️ Technology Stack

- **Backend**: Python 3.x, Flask (Web Framework)
- **Database**: MongoDB (Technical specs & audit logs)
- **AI/ML**:
  - **Gemini 2.5 Flash**: Vision Language Model (VLM) for cavity mapping.
  - **OpenRouter API**: For LLM-based extraction scoring and technical validation.
- **Frontend**:
  - Vanilla JavaScript, HTML5, CSS3
  - **PDF.js**: Client-side PDF processing.
  - **SSE (Server-Sent Events)**: For real-time pipeline log streaming.
- **DevOps**: `.env` configuration for secure key management.

---

## 📝 Prerequisites

- **Python 3.8+** installed.
- **MongoDB** instance running locally (default: `localhost:27017`).
- **Gemini API Key** (Google AI Studio).
- **OpenRouter API Key**.

---

## ⚙️ Installation & Setup

Follow these steps to get the project running locally:

### 1. Clone the Repository
```bash
git clone <repository-url>
cd AI_Project
```

### 2. Set Up Virtual Environment
```bash
python -m venv venv
# On Windows:
venv\Scripts\activate
# On Linux/macOS:
source venv/bin/activate
```

### 3. Install Dependencies
```bash
pip install -r requirements.txt
```

### 4. Configure Environment Variables
Copy the example environment file and fill in your actual API keys:
```bash
cp .env.example .env
```
Edit `.env` and provide your:
- `GEMINI_KEY`
- `OPENROUTER_KEY`
- `MONGO_URI` (if different from default)

### 5. Run the Application
```bash
python app.py
```
Access the dashboard at `http://localhost:5000`.

---

## 📖 Step-by-Step Usage Guide

### Phase 1: Documentation Intake
1. Navigate to **Connector Intake** in the sidebar.
2. Upload a technical assembly PDF.
3. The system will automatically find the best diagram, extract the reference number, and save the port configuration to the database.

### Phase 2: Live QC Inspection
1. Navigate to **QC Conformity** in the sidebar.
2. Select the **Reference** you just uploaded from the dropdown menu.
3. Show the physical connector to the camera.
4. Click **RUN QC ANALYSIS**.
5. View the real-time verdict, matching score, and textual justification.

### Phase 3: Audit & History
1. Navigate to **System History** to review all interactions, theme changes, and navigation logs tracked by the History Agent.

---

## 👥 Credits

This project was developed by the **Token Thieves** engineering students at **ESPRIT** (2026).

- **Team Name**: Token Thieves
- **Institution**: ESPRIT (Ecole Supérieure Privée d'Ingénierie et de Technologies)
- **Year**: 2026
