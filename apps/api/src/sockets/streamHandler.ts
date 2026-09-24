import { Server as SocketIOServer, Socket } from 'socket.io';
import jwt from 'jsonwebtoken';
import { config } from '../config.js';

export class StreamHandler {
  private io: SocketIOServer;
  private activeClients: number = 0;

  constructor(io: SocketIOServer) {
    this.io = io;
    this.setupMiddleware();
    this.setupEvents();
    this.startHeartbeat();
  }

  private setupMiddleware() {
    this.io.use((socket: Socket, next) => {
      // Support both cookie-based JWT and Authorization header (for scraper workers)
      const cookieToken = socket.handshake.headers.cookie
        ?.split(';')
        .find(c => c.trim().startsWith(`${config.cookieName}=`))
        ?.split('=')[1];

      const bearerToken = socket.handshake.auth?.token
        || socket.handshake.headers?.authorization?.replace('Bearer ', '');

      const token = cookieToken || bearerToken;

      if (token) {
        try {
          const decoded = jwt.verify(token, config.jwtSecret);
          socket.data.user = decoded;
        } catch (e) {
          // Non-blocking — socket stream is observable but full auth needed for write ops
        }
      }
      next();
    });
  }

  private setupEvents() {
    this.io.on('connection', (socket: Socket) => {
      this.activeClients++;
      console.log(`[Socket.io] Terminal client connected: ${socket.id} (Total: ${this.activeClients})`);

      socket.emit('system:status', {
        serverTime: new Date().toISOString(),
        clients: this.activeClients,
        status: 'CONNECTED',
        stream: 'VANTA_INSTITUTIONAL_STREAM_V3'
      });

      socket.on('channel:subscribe', (channel: string) => {
        socket.join(channel);
        socket.emit('channel:subscribed', { channel });
      });

      socket.on('disconnect', () => {
        this.activeClients = Math.max(0, this.activeClients - 1);
        console.log(`[Socket.io] Terminal client disconnected: ${socket.id} (Total: ${this.activeClients})`);
      });
    });
  }

  private startHeartbeat() {
    setInterval(() => {
      const now = Date.now();
      this.io.emit('telemetry:heartbeat', {
        timestamp: new Date(now).toISOString(),
        epochMs: now,
        connectedClients: this.activeClients,
        stream: 'VANTA_V3'
      });
    }, 5000);
  }

  public broadcastEvent(event: any) {
    this.io.emit('calendar:event', event);
    if (event.asset) {
      this.io.to(event.asset).emit('calendar:event', event);
    }
    // High-impact events trigger priority deviation alert
    if (event.impact_level === 'High' || Math.abs(event.deviation_score || 0) >= 0.05) {
      this.io.emit('calendar:deviation_alert', {
        event,
        alertTime: new Date().toISOString(),
        severity: event.impact_level === 'High' ? 'CRITICAL' : 'ELEVATED'
      });
    }
  }

  public broadcastNews(newsItem: any) {
    this.io.emit('news:item', newsItem);
  }

  public broadcastCotUpdate(cotPayload: any) {
    this.io.emit('cot:update', cotPayload);
  }

  public broadcastScraperHealth(healthPayload: any) {
    this.io.emit('system:scraper_health', healthPayload);
  }

  public getActiveClients(): number {
    return this.activeClients;
  }
}
