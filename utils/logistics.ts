import { InternalStatus, OrderStatus, Origin, Invoice } from '../types';
import { MessageIntent } from '../services/messageAgent';

/**
 * The logistics "brain" shared by the tracking agent, the client-facing
 * progress bar, and the WhatsApp message agent — one taxonomy, so a tracking
 * milestone automatically knows which client message to offer.
 */

/** Days a container/parcel sits at the port before we prompt "ready yet?". */
export const GRACE_DAYS = 7;

/** The pipeline, in order. Both origins share it; labels differ by origin. */
export const PIPELINE: InternalStatus[] = [
  InternalStatus.ORDER_PLACED,
  InternalStatus.INLAND,
  InternalStatus.AT_FORWARDER,
  InternalStatus.INTERNATIONAL,
  InternalStatus.ARRIVED_PORT,
  InternalStatus.READY,
  InternalStatus.DELIVERED
];

/** Human labels for each internal step, tuned per origin. */
export function internalLabel(status: InternalStatus, origin?: Origin): string {
  const cn = origin !== 'US-UK';
  switch (status) {
    case InternalStatus.ORDER_PLACED: return 'Order placed with supplier';
    case InternalStatus.INLAND: return cn ? 'Inland China → forwarder' : 'US/UK domestic → forwarder';
    case InternalStatus.AT_FORWARDER: return cn ? 'At Guangzhou forwarder' : 'At Delaware warehouse';
    case InternalStatus.INTERNATIONAL: return cn ? 'In container · sailing to Mombasa' : 'In transit to Kenya (air)';
    case InternalStatus.ARRIVED_PORT: return cn ? 'Arrived Mombasa port' : 'Arrived Kenya (JKIA/customs)';
    case InternalStatus.READY: return 'Ready for collection / delivery';
    case InternalStatus.DELIVERED: return 'Delivered & completed';
    default: return status;
  }
}

/** What the CUSTOMER sees on the tracking page for a given internal status. */
export function internalToClientStatus(status: InternalStatus): OrderStatus {
  switch (status) {
    case InternalStatus.ORDER_PLACED: return OrderStatus.RECEIVED_BY_AGENT;
    case InternalStatus.INLAND: return OrderStatus.PREPARING;
    case InternalStatus.AT_FORWARDER: return OrderStatus.COLLECTED;
    case InternalStatus.INTERNATIONAL: return OrderStatus.SHIPPING;
    case InternalStatus.ARRIVED_PORT: return OrderStatus.LANDED_CUSTOMS;
    case InternalStatus.READY: return OrderStatus.READY_FOR_COLLECTION;
    case InternalStatus.DELIVERED: return OrderStatus.DELIVERED;
    default: return OrderStatus.RECEIVED_BY_AGENT;
  }
}

/** A 0-100 progress number for the client bar. */
export function internalToProgress(status: InternalStatus): number {
  const i = PIPELINE.indexOf(status);
  if (i < 0) return 10;
  return Math.round(10 + (i / (PIPELINE.length - 1)) * 90);
}

/**
 * The WhatsApp message intent that naturally goes with reaching this status —
 * the "symmetrical" link the owner asked for. null = no client message here.
 */
export function internalToMessageIntent(status: InternalStatus): MessageIntent | null {
  switch (status) {
    case InternalStatus.INTERNATIONAL: return 'shipped';
    case InternalStatus.READY: return 'ready';
    case InternalStatus.DELIVERED: return 'thanks';
    default: return null;
  }
}

export function nextStatus(status: InternalStatus): InternalStatus | null {
  const i = PIPELINE.indexOf(status);
  return i >= 0 && i < PIPELINE.length - 1 ? PIPELINE[i + 1] : null;
}

/** Effective internal status of an order (defaults to ORDER_PLACED). */
export function orderInternalStatus(inv: Invoice): InternalStatus {
  return (inv.internalStatus as InternalStatus) || InternalStatus.ORDER_PLACED;
}

/** When the grace period ends after arriving at the port (or null). */
export function graceEndsAt(inv: Invoice): Date | null {
  if (!inv.mombasaArrivedAt) return null;
  const d = new Date(inv.mombasaArrivedAt);
  if (isNaN(d.getTime())) return null;
  d.setDate(d.getDate() + GRACE_DAYS);
  return d;
}

export interface AttentionItem {
  invoice: Invoice;
  reason: 'grace_elapsed' | 'ready_unpaid' | 'shipped_no_message';
  message: string;
  suggestedIntent: MessageIntent | null;
}

/**
 * What needs the admin's attention right now — computed on dashboard load
 * (no background cron needed for a single-admin shop). This is the "Watcher".
 */
export function computeAttention(invoices: Invoice[]): AttentionItem[] {
  const now = Date.now();
  const items: AttentionItem[] = [];
  for (const inv of invoices) {
    const status = orderInternalStatus(inv);
    if (status === InternalStatus.DELIVERED) continue;

    // Container/parcel sat at the port past the grace window → confirm ready.
    if (status === InternalStatus.ARRIVED_PORT) {
      const ends = graceEndsAt(inv);
      if (ends && now >= ends.getTime()) {
        items.push({
          invoice: inv,
          reason: 'grace_elapsed',
          message: `${inv.containerNumber ? `Container ${inv.containerNumber}` : 'This order'} has been at the port ${GRACE_DAYS}+ days — is it cleared and ready to collect?`,
          suggestedIntent: 'ready'
        });
        continue;
      }
    }

    // Ready to collect but still owes money → nudge for the balance.
    if (status === InternalStatus.READY) {
      const balance = Math.max((inv.totalKES || 0) - (inv.amountPaidKES || 0), 0);
      items.push({
        invoice: inv,
        reason: balance > 0 ? 'ready_unpaid' : 'shipped_no_message',
        message: balance > 0
          ? `Ready to collect with KES ${balance.toLocaleString()} still due — send the ready-for-pickup message with the pay link.`
          : `Ready to collect — let ${inv.clientName.split(' ')[0]} know it's ready.`,
        suggestedIntent: 'ready'
      });
    }
  }
  return items;
}

/** Group China orders by their shared container number (for cascade updates). */
export function groupByContainer(invoices: Invoice[]): Record<string, Invoice[]> {
  const map: Record<string, Invoice[]> = {};
  for (const inv of invoices) {
    if (inv.containerNumber) {
      (map[inv.containerNumber] ||= []).push(inv);
    }
  }
  return map;
}
