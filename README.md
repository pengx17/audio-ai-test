# Live Caption with Whisper + AI Summary

This project provides real-time audio captioning using OpenAI's Whisper model and AI-powered summarization.

## Features

- [x] Real-time audio recording
- [x] Whisper transcription
- [ ] AI summary

## Prerequisites

- Node.js (v18 or higher)
- Yarn (v4.5.3 or higher)
- Python (for Whisper)

## Setup

1. Install dependencies:

   ```bash
   yarn install
   ```

2. Set up Whisper:
   ```bash
   # Install Whisper dependencies (Mac only)
   pip install -U mlx-whisper
   ```

## Development

1. Start the development server:

   ```bash
   yarn dev
   ```

2. In a separate terminal, start the backend server:

   ```bash
   cd server
   yarn dev
   ```

3. Open your browser and navigate to `http://localhost:5173`

## Project Structure

- `/src` - Frontend React application
- `/server` - Backend server with Whisper integration
