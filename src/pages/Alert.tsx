import React, { useEffect, useState, useRef } from 'react';
import { subscribeToEvent } from '../service/socket';
import { useModal } from '../Context/Modal';
import UnAuthorizedModal from './UnAuthorizedModal';
import { useAuth } from '../Context/Auth';

const Alert: React.FC = () => {
  const { role } = useAuth();
  const { showModal } = useModal();
  const [alertMessages, setAlertMessages] = useState<
    { image?: string; message: string }[]
  >([]);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  useEffect(() => {
    subscribeToEvent(
      'alert:notification',
      (message: { image?: string; message: string }) => {
        playRingtone();
        setAlertMessages((prev) => [...prev, message]);
        console.log('alert:notification', message);
      },
    );

    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
      }
    };
  }, []);

  const openModal = () => {
    showModal(
      <UnAuthorizedModal alertMessage={alertMessages} />,
      'Un Authorized Person',
      (result) => {
        if (result) {
          setAlertMessages([]);
          stopRingtone();
        }
      },
    );
  };

  // Function to play the ringtone
  const playRingtone = () => {
    if (audioRef.current) {
      audioRef.current.play().catch((error) => {
        console.error('Error playing audio:', error);
      });
    } else {
      audioRef.current = new Audio('/audio/danger_warning.mp3');
      audioRef.current.play().catch((error) => {
        console.error('Error playing audio:', error);
      });
    }
  };

  // Function to stop the ringtone
  const stopRingtone = () => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
    }
  };

  return (
    <>
      {alertMessages.length > 0 && (
      <div
        onClick={openModal}
        className="fixed cursor-pointer top-16 left-0 w-full bg-red-500 text-center animate-dimLight z-50 lg:ml-20"
      >
        <h1 className="text-white">
          {alertMessages.length} Un Authorized Person(s) Detected
          <span className="underline"> Click here</span>
        </h1>
      </div>
    )}
    </>
  );
};

export default Alert;
