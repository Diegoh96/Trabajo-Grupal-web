/**
 * PATRÓN DE COMPORTAMIENTO: Observer
 * Permite reaccionar a una reserva confirmada sin acoplar esas acciones al
 * servicio principal de reservas.
 */
class BookingSubject {
  constructor() {
    this.observers = [];
  }

  subscribe(observer) {
    this.observers.push(observer);
  }

  notify(eventName, payload) {
    for (const observer of this.observers) observer.update(eventName, payload);
  }
}

export class TicketNotificationObserver {
  update(eventName, payload) {
    if (eventName === 'booking.confirmed') {
      console.log(`[Observer:Ticket] Reserva ${payload.id} confirmada para ${payload.email_cliente}.`);
    }
  }
}

export class AdminAuditObserver {
  update(eventName, payload) {
    if (eventName === 'booking.confirmed') {
      console.log(`[Observer:Auditoría] Venta registrada por $${payload.total}.`);
    }
  }
}

export const bookingSubject = new BookingSubject();
bookingSubject.subscribe(new TicketNotificationObserver());
bookingSubject.subscribe(new AdminAuditObserver());
