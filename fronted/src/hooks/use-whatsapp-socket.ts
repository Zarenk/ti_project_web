import { useEffect, useState } from 'react';
import { io, Socket } from 'socket.io-client';

interface WhatsAppSocketData {
  qrCode: string | null;
  isConnected: boolean;
  phoneNumber: string | null;
  status: 'DISCONNECTED' | 'CONNECTING' | 'CONNECTED' | 'QR_PENDING';
}

export function useWhatsAppSocket(
  organizationId: number | null,
  companyId: number | null,
  enabled: boolean = true
) {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [data, setData] = useState<WhatsAppSocketData>({
    qrCode: null,
    isConnected: false,
    phoneNumber: null,
    status: 'DISCONNECTED',
  });

  useEffect(() => {
    if (!enabled || !organizationId || !companyId) {
      return;
    }

    const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:4000';

    const socketInstance = io(`${BACKEND_URL}/whatsapp`, {
      withCredentials: true,
      transports: ['websocket', 'polling'],
    });

    socketInstance.on('connect', () => {
      console.log('[WhatsApp Socket] Connected');
      socketInstance.emit('join', { organizationId, companyId });
    });

    socketInstance.on('joined', (payload) => {
      console.log('[WhatsApp Socket] Joined room:', payload.room);
    });

    socketInstance.on('qr', (payload) => {
      console.log('[WhatsApp Socket] QR Code received');
      setData((prev) => ({
        ...prev,
        qrCode: payload.qrCode,
        status: 'QR_PENDING',
        isConnected: false,
      }));
    });

    socketInstance.on('connected', (payload) => {
      console.log('[WhatsApp Socket] WhatsApp connected:', payload.phoneNumber);
      setData((prev) => ({
        ...prev,
        qrCode: null,
        isConnected: true,
        phoneNumber: payload.phoneNumber,
        status: 'CONNECTED',
      }));
    });

    socketInstance.on('disconnected', (payload) => {
      console.log('[WhatsApp Socket] WhatsApp disconnected');
      setData((prev) => ({
        ...prev,
        qrCode: null,
        isConnected: false,
        phoneNumber: null,
        status: 'DISCONNECTED',
      }));
    });

    socketInstance.on('status-update', (payload) => {
      console.log('[WhatsApp Socket] Status update:', payload.status);
      setData((prev) => ({
        ...prev,
        status: payload.status,
      }));
    });

    socketInstance.on('disconnect', () => {
      console.log('[WhatsApp Socket] Socket disconnected');
    });

    setSocket(socketInstance);

    return () => {
      socketInstance.emit('leave');
      socketInstance.disconnect();
    };
  }, [organizationId, companyId, enabled]);

  return { ...data, socket };
}
