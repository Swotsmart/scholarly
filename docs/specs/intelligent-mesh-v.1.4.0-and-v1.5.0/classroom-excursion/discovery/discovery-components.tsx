/**
 * Discovery Capture Components
 * 
 * React components for the student outdoor discovery and capture app.
 * Enables students to capture photos, notes, audio, and other data
 * for their excursion assignments - all working offline.
 * 
 * ## Features
 * 
 * - Camera capture with geolocation
 * - Voice memo recording with transcription
 * - Text notes with tags
 * - Sensor data collection (if available)
 * - QR code scanning for location markers
 * - Offline queue with visual feedback
 * - Task progress tracking
 * 
 * @module IntelligenceMesh/ClassroomExcursion/Discovery
 * @version 1.0.0
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { OfflineExcursionManager, CaptureResult } from '../offline/offline-excursion-manager';
import { CaptureType, GeoLocation, TaskStatus, DiscoveryTask, SyncStatus } from '../classroom-excursion.types';

// ============================================================================
// HOOKS
// ============================================================================

/**
 * Hook for managing offline excursion state
 */
export function useOfflineExcursion(manager: OfflineExcursionManager, excursionId: string) {
  const [isOnline, setIsOnline] = useState(manager.isOnline());
  const [syncStatus, setSyncStatus] = useState<{
    pendingCount: number;
    criticalPending: number;
    lastSync: string | null;
  }>({ pendingCount: 0, criticalPending: 0, lastSync: null });
  const [isSyncing, setIsSyncing] = useState(false);

  useEffect(() => {
    // Subscribe to connectivity changes
    const unsubConnectivity = manager.on('connectivityChange', ({ online }) => {
      setIsOnline(online);
    });

    // Subscribe to sync progress
    const unsubProgress = manager.on('syncProgress', (progress) => {
      setIsSyncing(progress.phase !== 'complete' && progress.phase !== 'error');
    });

    // Poll sync status
    const pollStatus = async () => {
      const status = await manager.getSyncStatus();
      setSyncStatus({
        pendingCount: status.pendingCount,
        criticalPending: status.criticalPending,
        lastSync: status.lastSync
      });
    };

    pollStatus();
    const interval = setInterval(pollStatus, 5000);

    return () => {
      unsubConnectivity();
      unsubProgress();
      clearInterval(interval);
    };
  }, [manager]);

  return { isOnline, syncStatus, isSyncing };
}

/**
 * Hook for geolocation
 */
export function useGeolocation() {
  const [location, setLocation] = useState<GeoLocation | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const getLocation = useCallback(() => {
    if (!navigator.geolocation) {
      setError('Geolocation not supported');
      return;
    }

    setLoading(true);
    setError(null);

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setLocation({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          accuracy: position.coords.accuracy,
          altitude: position.coords.altitude || undefined
        });
        setLoading(false);
      },
      (err) => {
        setError(err.message);
        setLoading(false);
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  }, []);

  return { location, error, loading, getLocation };
}

// ============================================================================
// COMPONENTS
// ============================================================================

interface SyncStatusIndicatorProps {
  isOnline: boolean;
  pendingCount: number;
  criticalPending: number;
  isSyncing: boolean;
  onForceSync: () => void;
}

/**
 * Visual indicator for sync status
 */
export const SyncStatusIndicator: React.FC<SyncStatusIndicatorProps> = ({
  isOnline,
  pendingCount,
  criticalPending,
  isSyncing,
  onForceSync
}) => {
  return (
    <div className={`sync-status ${isOnline ? 'online' : 'offline'}`}>
      <div className="status-dot" />
      <span className="status-text">
        {isOnline ? 'Online' : 'Offline'}
      </span>
      
      {pendingCount > 0 && (
        <span className="pending-badge">
          {criticalPending > 0 && (
            <span className="critical">{criticalPending} critical</span>
          )}
          <span>{pendingCount} pending</span>
        </span>
      )}
      
      {isSyncing && <span className="syncing">Syncing...</span>}
      
      {isOnline && pendingCount > 0 && !isSyncing && (
        <button onClick={onForceSync} className="sync-button">
          Sync Now
        </button>
      )}
    </div>
  );
};

interface PhotoCaptureProps {
  onCapture: (blob: Blob, location?: GeoLocation) => void;
  disabled?: boolean;
}

/**
 * Camera capture component
 */
export const PhotoCapture: React.FC<PhotoCaptureProps> = ({ onCapture, disabled }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [capturing, setCapturing] = useState(false);
  const { location, getLocation } = useGeolocation();

  const startCamera = async () => {
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' },
        audio: false
      });
      
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
        videoRef.current.play();
      }
      
      setStream(mediaStream);
      setCapturing(true);
      
      // Get location when camera starts
      getLocation();
    } catch (err) {
      console.error('Failed to start camera:', err);
    }
  };

  const stopCamera = () => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
      setStream(null);
    }
    setCapturing(false);
  };

  const takePhoto = () => {
    if (!videoRef.current || !canvasRef.current) return;

    const video = videoRef.current;
    const canvas = canvasRef.current;
    
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    ctx.drawImage(video, 0, 0);
    
    canvas.toBlob((blob) => {
      if (blob) {
        onCapture(blob, location || undefined);
        stopCamera();
      }
    }, 'image/jpeg', 0.85);
  };

  useEffect(() => {
    return () => {
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
    };
  }, [stream]);

  return (
    <div className="photo-capture">
      {!capturing ? (
        <button 
          onClick={startCamera} 
          disabled={disabled}
          className="capture-start-button"
        >
          📷 Take Photo
        </button>
      ) : (
        <div className="camera-preview">
          <video ref={videoRef} playsInline autoPlay muted />
          <canvas ref={canvasRef} style={{ display: 'none' }} />
          
          <div className="camera-controls">
            <button onClick={stopCamera} className="cancel-button">
              Cancel
            </button>
            <button onClick={takePhoto} className="shutter-button">
              📸
            </button>
          </div>
          
          {location && (
            <div className="location-indicator">
              📍 Location captured
            </div>
          )}
        </div>
      )}
    </div>
  );
};

interface VoiceMemoProps {
  onCapture: (blob: Blob, duration: number) => void;
  maxDuration?: number;
  disabled?: boolean;
}

/**
 * Voice memo recording component
 */
export const VoiceMemo: React.FC<VoiceMemoProps> = ({ 
  onCapture, 
  maxDuration = 120,
  disabled 
}) => {
  const [recording, setRecording] = useState(false);
  const [duration, setDuration] = useState(0);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<number | null>(null);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      chunksRef.current = [];
      
      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          chunksRef.current.push(e.data);
        }
      };
      
      mediaRecorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: 'audio/webm' });
        onCapture(blob, duration);
        stream.getTracks().forEach(track => track.stop());
      };
      
      mediaRecorder.start();
      setRecording(true);
      setDuration(0);
      
      timerRef.current = window.setInterval(() => {
        setDuration(d => {
          if (d >= maxDuration) {
            stopRecording();
            return d;
          }
          return d + 1;
        });
      }, 1000);
      
    } catch (err) {
      console.error('Failed to start recording:', err);
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && recording) {
      mediaRecorderRef.current.stop();
      setRecording(false);
      
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    }
  };

  const formatDuration = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="voice-memo">
      {!recording ? (
        <button 
          onClick={startRecording} 
          disabled={disabled}
          className="record-button"
        >
          🎤 Record Voice Memo
        </button>
      ) : (
        <div className="recording-controls">
          <div className="recording-indicator">
            <span className="pulse">●</span>
            Recording: {formatDuration(duration)}
          </div>
          <button onClick={stopRecording} className="stop-button">
            ⬛ Stop
          </button>
        </div>
      )}
    </div>
  );
};

interface TextNoteProps {
  onSubmit: (text: string, tags: string[]) => void;
  suggestedTags?: string[];
  disabled?: boolean;
}

/**
 * Text note entry component
 */
export const TextNote: React.FC<TextNoteProps> = ({ 
  onSubmit, 
  suggestedTags = [],
  disabled 
}) => {
  const [text, setText] = useState('');
  const [tags, setTags] = useState<string[]>([]);
  const [newTag, setNewTag] = useState('');

  const handleSubmit = () => {
    if (text.trim()) {
      onSubmit(text.trim(), tags);
      setText('');
      setTags([]);
    }
  };

  const addTag = (tag: string) => {
    if (tag && !tags.includes(tag)) {
      setTags([...tags, tag]);
    }
    setNewTag('');
  };

  const removeTag = (tag: string) => {
    setTags(tags.filter(t => t !== tag));
  };

  return (
    <div className="text-note">
      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="Type your observation or note..."
        disabled={disabled}
        rows={4}
      />
      
      <div className="tags-section">
        <div className="current-tags">
          {tags.map(tag => (
            <span key={tag} className="tag">
              {tag}
              <button onClick={() => removeTag(tag)}>×</button>
            </span>
          ))}
        </div>
        
        <div className="add-tag">
          <input
            value={newTag}
            onChange={(e) => setNewTag(e.target.value)}
            placeholder="Add tag..."
            onKeyPress={(e) => e.key === 'Enter' && addTag(newTag)}
          />
          <button onClick={() => addTag(newTag)}>+</button>
        </div>
        
        {suggestedTags.length > 0 && (
          <div className="suggested-tags">
            {suggestedTags.filter(t => !tags.includes(t)).map(tag => (
              <button 
                key={tag} 
                onClick={() => addTag(tag)}
                className="suggested-tag"
              >
                + {tag}
              </button>
            ))}
          </div>
        )}
      </div>
      
      <button 
        onClick={handleSubmit}
        disabled={disabled || !text.trim()}
        className="submit-button"
      >
        📝 Save Note
      </button>
    </div>
  );
};

interface TaskCardProps {
  task: DiscoveryTask;
  progress: {
    status: TaskStatus;
    capturesSubmitted: number;
  };
  onStartTask: () => void;
  onOpenTask: () => void;
}

/**
 * Discovery task card
 */
export const TaskCard: React.FC<TaskCardProps> = ({ 
  task, 
  progress, 
  onStartTask,
  onOpenTask 
}) => {
  const totalRequired = task.requiredCaptures.reduce((sum, r) => sum + r.count, 0);
  const progressPercent = (progress.capturesSubmitted / totalRequired) * 100;

  return (
    <div className={`task-card status-${progress.status}`}>
      <div className="task-header">
        <h3>{task.title}</h3>
        {task.points && <span className="points">{task.points} pts</span>}
      </div>
      
      <p className="task-instructions">{task.instructions}</p>
      
      <div className="task-requirements">
        {task.requiredCaptures.map((req, i) => (
          <span key={i} className="requirement">
            {req.count}× {req.type}
          </span>
        ))}
      </div>
      
      {task.locationBound && (
        <div className="location-requirement">
          📍 Must be at {task.locationBound.locationName}
        </div>
      )}
      
      <div className="task-progress">
        <div 
          className="progress-bar" 
          style={{ width: `${progressPercent}%` }}
        />
        <span>{progress.capturesSubmitted} / {totalRequired}</span>
      </div>
      
      <div className="task-actions">
        {progress.status === TaskStatus.NOT_STARTED ? (
          <button onClick={onStartTask} className="start-button">
            Start Task
          </button>
        ) : progress.status === TaskStatus.IN_PROGRESS ? (
          <button onClick={onOpenTask} className="continue-button">
            Continue
          </button>
        ) : (
          <span className="status-badge">{progress.status}</span>
        )}
      </div>
    </div>
  );
};

interface DiscoveryAppProps {
  manager: OfflineExcursionManager;
  excursionId: string;
  studentId: string;
  studentName: string;
}

/**
 * Main Discovery App component
 */
export const DiscoveryApp: React.FC<DiscoveryAppProps> = ({
  manager,
  excursionId,
  studentId,
  studentName
}) => {
  const { isOnline, syncStatus, isSyncing } = useOfflineExcursion(manager, excursionId);
  const [tasks, setTasks] = useState<any[]>([]);
  const [selectedTask, setSelectedTask] = useState<any | null>(null);
  const [captures, setCaptures] = useState<any[]>([]);
  const { location, getLocation } = useGeolocation();

  useEffect(() => {
    loadTasks();
    getLocation();
  }, [excursionId]);

  const loadTasks = async () => {
    const taskList = await manager.getTasks(excursionId);
    setTasks(taskList);
  };

  const loadCaptures = async (taskId: string) => {
    const captureList = await manager.getCapturesForTask(excursionId, taskId);
    setCaptures(captureList);
  };

  const handlePhotoCapture = async (blob: Blob, loc?: GeoLocation) => {
    if (!selectedTask) return;
    
    await manager.submitCapture(excursionId, selectedTask.taskId, studentId, CaptureType.PHOTO, {
      mediaBlob: blob,
      location: loc || location || undefined
    });
    
    loadCaptures(selectedTask.taskId);
  };

  const handleVoiceCapture = async (blob: Blob, duration: number) => {
    if (!selectedTask) return;
    
    await manager.submitCapture(excursionId, selectedTask.taskId, studentId, CaptureType.VOICE_MEMO, {
      mediaBlob: blob,
      location: location || undefined
    });
    
    loadCaptures(selectedTask.taskId);
  };

  const handleNoteSubmit = async (text: string, tags: string[]) => {
    if (!selectedTask) return;
    
    await manager.submitCapture(excursionId, selectedTask.taskId, studentId, CaptureType.TEXT_NOTE, {
      textContent: text,
      tags,
      location: location || undefined
    });
    
    loadCaptures(selectedTask.taskId);
  };

  const handleForceSync = () => {
    manager.forceSync();
  };

  return (
    <div className="discovery-app">
      <header>
        <h1>Discovery Tasks</h1>
        <span className="student-name">{studentName}</span>
        <SyncStatusIndicator
          isOnline={isOnline}
          pendingCount={syncStatus.pendingCount}
          criticalPending={syncStatus.criticalPending}
          isSyncing={isSyncing}
          onForceSync={handleForceSync}
        />
      </header>
      
      {!selectedTask ? (
        <div className="task-list">
          {tasks.map(task => (
            <TaskCard
              key={task.taskId}
              task={task}
              progress={{
                status: TaskStatus.NOT_STARTED,
                capturesSubmitted: 0
              }}
              onStartTask={() => {
                setSelectedTask(task);
                loadCaptures(task.taskId);
              }}
              onOpenTask={() => {
                setSelectedTask(task);
                loadCaptures(task.taskId);
              }}
            />
          ))}
        </div>
      ) : (
        <div className="task-detail">
          <button 
            onClick={() => setSelectedTask(null)}
            className="back-button"
          >
            ← Back to Tasks
          </button>
          
          <h2>{selectedTask.title}</h2>
          <p>{selectedTask.instructions}</p>
          
          <div className="capture-tools">
            <PhotoCapture onCapture={handlePhotoCapture} />
            <VoiceMemo onCapture={handleVoiceCapture} />
            <TextNote 
              onSubmit={handleNoteSubmit}
              suggestedTags={selectedTask.curriculumCodes || []}
            />
          </div>
          
          <div className="captures-list">
            <h3>Your Captures ({captures.length})</h3>
            {captures.map(cap => (
              <div key={cap.localId} className="capture-item">
                <span className="capture-type">{cap.type}</span>
                <span className="capture-time">
                  {new Date(cap.capturedAt).toLocaleTimeString()}
                </span>
                <span className={`sync-status ${cap.syncStatus}`}>
                  {cap.syncStatus === SyncStatus.SYNCED ? '✓' : '⏳'}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default DiscoveryApp;
