import { Injectable, Logger } from '@nestjs/common';

/**
 * Tracks whether any frontend is currently connected over WebSocket.
 *
 * The realtime cron jobs only produce data that is pushed to connected clients,
 * so with nobody watching every tick was wasted work — including two Redis
 * round-trips per tick before the job's own guard could bail out. Instead of
 * ticking and returning early, the scheduler subscribes here and creates the
 * jobs on the first connection / destroys them after the last disconnect.
 *
 * Socket ids are held in a Set because PgRestGateway and ValueChangeStateGateway
 * share the default namespace: both receive handleConnection for the SAME socket,
 * and the Set keeps that from double counting.
 */
@Injectable()
export class RealtimePresenceService {
  private readonly logger = new Logger(RealtimePresenceService.name);
  private readonly clients = new Set<string>();
  private readonly listeners: Array<(active: boolean) => void> = [];

  /**
   * Grace period before declaring the frontend gone. A page reload or a Next
   * route transition briefly drops the socket; without this the jobs would be
   * torn down and rebuilt on every navigation.
   */
  private readonly graceMs = 45_000;
  private stopTimer: NodeJS.Timeout | null = null;
  private active = false;

  onActiveChange(listener: (active: boolean) => void): void {
    this.listeners.push(listener);
  }

  addClient(socketId: string): void {
    const isNew = !this.clients.has(socketId);
    this.clients.add(socketId);
    if (!isNew) return;

    if (this.stopTimer) {
      clearTimeout(this.stopTimer);
      this.stopTimer = null;
      this.logger.log(`Client reconnected within grace period (${this.clients.size} connected)`);
    }
    if (!this.active) {
      this.active = true;
      this.logger.log(`First client connected — starting realtime jobs`);
      this.emit(true);
    }
  }

  removeClient(socketId: string): void {
    if (!this.clients.delete(socketId)) return;
    if (this.clients.size > 0 || !this.active || this.stopTimer) return;

    this.stopTimer = setTimeout(() => {
      this.stopTimer = null;
      if (this.clients.size === 0 && this.active) {
        this.active = false;
        this.logger.log('No clients connected — stopping realtime jobs');
        this.emit(false);
      }
    }, this.graceMs);
    // Do not keep the event loop alive purely for the grace timer.
    this.stopTimer.unref?.();
  }

  get connectedCount(): number {
    return this.clients.size;
  }

  get isActive(): boolean {
    return this.active;
  }

  private emit(active: boolean): void {
    for (const listener of this.listeners) {
      try {
        listener(active);
      } catch (err) {
        this.logger.error(`Presence listener failed: ${err?.message}`, err?.stack);
      }
    }
  }
}
