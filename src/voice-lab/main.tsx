import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import '../index.css';
import { VoiceLab } from './VoiceLab';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <VoiceLab />
  </StrictMode>,
);
