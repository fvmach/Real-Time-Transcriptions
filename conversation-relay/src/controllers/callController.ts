import { CallDetails } from '../types';
import { config } from '../config';


export async function handleIncomingCall(callData: CallDetails): Promise<string> {
  // Validate and process incoming call
  if (!callData) {
    throw new Error('Invalid call data');
  }

  // Refer the ConversationRelay docs for a complete list of attributes - https://www.twilio.com/docs/voice/twiml/connect/conversationrelay#conversationrelay-attributes
  return `<Response>
            <Connect action="https://${config.ngrok.domain}/api/action">
                  <ConversationRelay url="wss://${config.ngrok.domain}" dtmfDetection="true" interruptible="true" interruptByDtmf="true" welcomeGreeting="${config.twilio.welcomeGreeting}" ttsProvider="Elevenlabs" voice="ilgZbJEIBLgC9EUuN7Dq" transcriptionProvider="Deepgram" transcriptionLanguage="es-419"> 
                  </ConversationRelay>
            </Connect>
          </Response>`;
}
