import { useEffect, useState, useCallback } from 'react';
import { io } from 'socket.io-client';
import axios from 'axios';
import { useSelector } from 'react-redux';
import { RootState } from '@/redux/store';

const API_URL = process.env.NEXT_PUBLIC_BACKEND_API_URL;

interface StreamInfo {
  deviceId: string;
  cameraIndex: number;
}

/** Normalise the jpeg field to an ArrayBufferLike regardless of how socket.io serialised it. */
function decodeJpeg(
  jpeg: ArrayBuffer | number[] | { type: 'Buffer'; data: number[] },
): ArrayBuffer {
  if (jpeg instanceof ArrayBuffer) return jpeg;
  if (
    jpeg !== null &&
    typeof jpeg === 'object' &&
    'type' in jpeg &&
    (jpeg as { type: string }).type === 'Buffer'
  ) {
    return Uint8Array.from((jpeg as { type: 'Buffer'; data: number[] }).data).buffer as ArrayBuffer;
  }
  return Uint8Array.from(jpeg as number[]).buffer as ArrayBuffer;
}

// ── Single camera tile ─────────────────────────────────────────────────────────

interface CameraStreamProps {
  deviceId: string;
  cameraIndex: number;
}

const CameraStream = ({ deviceId, cameraIndex }: CameraStreamProps) => {
  const [imgSrc, setImgSrc] = useState<string | null>(null);
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    const socket = io(`${API_URL}/camera`, {
      transports: ['websocket'],
    });

    socket.on('connect', () => {
      setConnected(true);
      socket.emit('camera:subscribe', { deviceId, cameraIndex });
    });

    socket.on('disconnect', () => setConnected(false));

    socket.on(
      'camera:frame',
      (data: {
        deviceId: string;
        cameraIndex: number;
        timestamp: number;
        jpeg: ArrayBuffer | number[] | { type: 'Buffer'; data: number[] };
      }) => {
        const blob = new Blob([decodeJpeg(data.jpeg)], { type: 'image/jpeg' });
        const url = URL.createObjectURL(blob);
        setImgSrc(prev => {
          if (prev) URL.revokeObjectURL(prev);
          return url;
        });
      },
    );

    return () => {
      socket.emit('camera:unsubscribe', { deviceId, cameraIndex });
      socket.disconnect();
      setImgSrc(prev => {
        if (prev) URL.revokeObjectURL(prev);
        return null;
      });
      setConnected(false);
    };
  }, [deviceId, cameraIndex]);

  return (
    <div className="camera_tile">
      <div className="camera_tile_header">
        <span className="camera_tile_label">
          <svg
            width="12"
            height="12"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <circle cx="12" cy="12" r="3" />
            <path d="M22 12c0-5.523-4.477-10-10-10S2 6.477 2 12s4.477 10 10 10 10-4.477 10-10z" />
          </svg>
          Camera {cameraIndex}
        </span>
        <span className={`camera_status_badge ${connected ? 'camera_status_live' : 'camera_status_waiting'}`}>
          {connected ? 'LIVE' : 'CONNECTING…'}
        </span>
      </div>

      <div className="camera_tile_body">
        {imgSrc ? (
          <img
            src={imgSrc}
            alt={`Camera ${cameraIndex} feed`}
            className="camera_tile_img"
          />
        ) : (
          <div className="camera_no_frame">
            <div className="camera_no_frame_icon">
              <svg
                width="48"
                height="48"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M23 7l-7 5 7 5V7z" />
                <rect x="1" y="5" width="15" height="14" rx="2" ry="2" />
                <line x1="1" y1="1" x2="23" y2="23" />
              </svg>
            </div>
            <p className="camera_no_frame_text">No Signal</p>
            <p className="camera_no_frame_subtext">Waiting for stream from Camera {cameraIndex}</p>
          </div>
        )}
      </div>
    </div>
  );
};

// ── Main camera feed block ─────────────────────────────────────────────────────

const CameraFeedBlock = () => {
  const entityIdValue = useSelector((state: RootState) => state.entityId.id);
  const [streams, setStreams] = useState<StreamInfo[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchStreams = useCallback(async () => {
    if (!entityIdValue) return;
    try {
      const res = await axios.get(`${API_URL}/cameras/devices`, {
        withCredentials: true,
      });
      const allStreams: StreamInfo[] = res.data?.streams ?? [];
      setStreams(allStreams.filter((s) => s.deviceId === entityIdValue));
    } catch {
      setStreams([]);
    } finally {
      setIsLoading(false);
    }
  }, [entityIdValue]);

  // Initial fetch + periodic refresh to pick up newly connected cameras
  useEffect(() => {
    fetchStreams();
    const interval = setInterval(fetchStreams, 30_000);
    return () => clearInterval(interval);
  }, [fetchStreams]);

  if (!entityIdValue) return null;

  return (
    <div className="data_viewer_card camera_feed_block">
      {/* Header */}
      <div className="camera_feed_block_header">
        <div className="camera_feed_title_row">
          <svg
            className="camera_feed_header_icon"
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M23 7l-7 5 7 5V7z" />
            <rect x="1" y="5" width="15" height="14" rx="2" ry="2" />
          </svg>
          <h3 className="dashboard_card_title" style={{ margin: 0 }}>
            Camera Feeds
          </h3>
        </div>

        <div className="camera_feed_meta">
          <button
            className="camera_refresh_btn"
            onClick={fetchStreams}
            title="Refresh camera list"
          >
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <polyline points="23 4 23 10 17 10" />
              <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10" />
            </svg>
          </button>
          {streams.length > 0 && (
            <span className="camera_stream_count">
              {streams.length} stream{streams.length !== 1 ? 's' : ''}
            </span>
          )}
        </div>
      </div>

      {/* Content */}
      {isLoading ? (
        <div className="camera_feed_loading">
          <div className="camera_spinner" />
          <p>Detecting camera streams…</p>
        </div>
      ) : streams.length === 0 ? (
        <div className="camera_feed_empty">
          <div className="camera_feed_empty_icon">
            <svg
              width="56"
              height="56"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M23 7l-7 5 7 5V7z" />
              <rect x="1" y="5" width="15" height="14" rx="2" ry="2" />
            </svg>
          </div>
          <p className="camera_feed_empty_title">No cameras available</p>
          <p className="camera_feed_empty_sub">
            No camera streams are configured for this device.
          </p>
        </div>
      ) : (
        <div className="camera_grid">
          {streams.map(({ deviceId, cameraIndex }) => (
            <CameraStream
              key={`${deviceId}:${cameraIndex}`}
              deviceId={deviceId}
              cameraIndex={cameraIndex}
            />
          ))}
        </div>
      )}
    </div>
  );
};

export default CameraFeedBlock;
