import React, { useState, useEffect } from 'react';
import { storage } from '../../lib/firebase';
import { uploadBytesResumable, ref, getDownloadURL } from 'firebase/storage';
import MicIcon from '@mui/icons-material/Mic';
import GraphicEqIcon from '@mui/icons-material/GraphicEq';
import { useChatStore } from "../../lib/chatStore";
import './voice.css';

const Voice = ({onComplete}) => {
    const [recording, setRecording] = useState(false);
    const [mediaRecorder, setMediaRecorder] = useState(null);
    const{ chatId, isCurrentUserBlocked, isReceiverBlocked, }= useChatStore();


    useEffect(() => {
        // Access the permission for use of the microphone
        const audioIN = { audio: true };
        navigator.mediaDevices.getUserMedia(audioIN)
            .then(mediaStreamObj => {
                // Initialize the media recorder with the audio stream
                const recorder = new MediaRecorder(mediaStreamObj);
                let dataArray = [];

                recorder.ondataavailable = event => {
                    dataArray.push(event.data);
                };

                recorder.onstop = () => {
                    const audioData = new Blob(dataArray, { type: 'audio/mp3' });

                    const date = new Date();
                    const storageRef = ref(storage, `voice_notes/${date.getTime() + chatId}.mp3`); // Use getTime() for unique file names
                    const uploadTask = uploadBytesResumable(storageRef, audioData);

                    uploadTask.on('state_changed',
                        (snapshot) => {
                            // Handle progress or other state changes if needed
                        },
                        (error) => {
                            console.error('Error uploading audio:', error);
                        },
                        () => {
                            // Upload completed successfully
                            getDownloadURL(uploadTask.snapshot.ref)
                                .then((url) => {
                                    onComplete(url);
                                })
                                .catch((error) => {
                                    console.error('Error getting download URL:', error);
                                });
                        }
                    );

                    // Reset dataArray for next recording
                    dataArray = [];
                };

                setMediaRecorder(recorder);
            })
            .catch(err => {
                console.error('Error accessing microphone:', err.name, err.message);
            });
    }, []);

    const handleStartRecording = () => {
        if (mediaRecorder) {
            mediaRecorder.start();
            setRecording(true);
        }
    };

    const handleStopRecording = () => {
        if (mediaRecorder) {
            mediaRecorder.stop();
            setRecording(false);
        }
    };

    return (
        <div>
            {recording ? 
            <GraphicEqIcon className={recording ? 'pulse' : ''} onClick={handleStopRecording} style={{cursor: 'pointer'}}/>
            :
            <MicIcon  onClick={handleStartRecording} style={{cursor: isCurrentUserBlocked || isReceiverBlocked ? "not-allowed" : "pointer"}} disabled={isCurrentUserBlocked || isReceiverBlocked}/>
        }
        </div>
    );
};

export default Voice;
