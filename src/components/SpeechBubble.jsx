import { Html } from '@react-three/drei'

export default function SpeechBubble({ text, speakerName, position }) {
  if (!text) return null
  return (
    <Html position={position} center distanceFactor={25} occlude={false}>
      <div className="speech-bubble">
        {speakerName && <div className="speaker-name">{speakerName}</div>}
        <div className="speaker-text">{text}</div>
      </div>
    </Html>
  )
}
