# Real-Time Transcriptions – Twilio Voice AI Samples

This repository provides end-to-end examples for real-time voice processing with Twilio, showcasing different approaches to speech-to-text, audio streaming, and AI agent interactions.

## Real-Time Transcription
**Reconocimiento de voz en tiempo real (solo STT)**
La API de Transcripciones en Tiempo Real y el TwiML <Transcription> permiten habilitar transcripción en tiempo real para llamadas de voz con Twilio, incluyendo Voice SDK, PSTN, llamadas por WhatsApp o cualquier llamada gestionada por Voice API.
Las transcripciones pueden activarse para todas las grabaciones de cuenta (como parte del servicio Voice Intelligence) o para llamadas específicas usando el TwiML <Transcription>.

## Conversation Relay
**Reconocimiento y síntesis de voz en tiempo real para agentes de IA (STT y TTS)**
Conversation Relay permite transcribir llamadas de voz en tiempo real con muy baja latencia y conectar esa transcripción a servicios LLM propios para construir agentes virtuales a escala.
Genera una conexión WebSocket bidireccional con soporte multilenguaje para STT y TTS.
Los clientes pueden elegir proveedores, idiomas y voces para TTS/STT según sus necesidades. También admite modos streaming y no streaming, para optimizar entre latencia y precisión.
Su estructura de mensajería basada en WebSocket permite una implementación más sencilla y rápida, en comparación con las implementaciones directas usando Media Streams, incluyendo el manejo de interrupciones y ejemplos para STT.

## Voice Intelligence
**Inteligencia de negocios accionable basada en IA para interacciones de voz**

Voice Intelligence permite configurar servicios analíticos basados en IA, con transcripciones en tiempo real o post-llamada, y operadores de lenguaje nativos o personalizados.
Las transcripciones pueden habilitarse para todas las llamadas o solo para algunas, usando la API de Transcripts o <Transcription> TwiML.
Cada servicio puede usar su propio conjunto de operadores para análisis de sentimientos, resumen, identificación de entidades, QA, verificación de guiones y cualquier análisis personalizado basado en prompts.


## Media Streams
**Streaming de audio en tiempo real desde llamadas de voz de Twilio**

Media Streams bifurca el audio de las llamadas y lo envía a servicios externos vía WebSocket. Puede ser:
- Unidireccional: para transcripción STT, resumen u otros procesos sin respuesta directa a la llamada, o
- Bidireccional: para usar modelos TTS con agentes virtuales basados en LLM o NLU.
Dado que el audio está codificado como audio/x-mulaw a 8000 Hz en fragmentos de 20 ms, se requiere un servicio STT de baja latencia y con buffer, como Google STT, Deepgram o la API Realtime de OpenAI.

**Nota:** No se recomienda usar modelos como Whisper API que requieren la pista completa de audio.


---

## Getting Started

1. Clone this repo:
   ```bash
   git clone https://github.com/fvmach/Real-Time-Transcriptions.git
