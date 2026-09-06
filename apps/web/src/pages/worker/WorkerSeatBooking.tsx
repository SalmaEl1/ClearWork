import { useAuth } from "../../auth/AuthContext.js";
import { useCallback, useEffect, useState } from "react";
import { ApiError } from "../../api/client.js";
import { cancelSeatReservation, fetchSeatAvailability, reserveSeat } from "../../api/seats.js";
import { ConfirmDialog } from "../../components/ConfirmDialog.js";
import { todayDateString } from "../../lib/dates.js";

export function WorkerSeatBooking() {
  const { user } = useAuth();
  const [date, setDate] = useState(todayDateString());
  const [totalSeats, setTotalSeats] = useState(0);
  const [reservations, setReservations] = useState<
    { id: string; seatNumber: number; userId: string; userFullName: string }[] | null
  >(null);
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [cancellingId, setCancellingId] = useState<string | null>(null);

  const load = useCallback(() => {
    fetchSeatAvailability(date)
      .then((availability) => {
        setTotalSeats(availability.totalSeats);
        setReservations(availability.reservations);
      })
      .catch((err) => setError(err instanceof ApiError ? err.message : "No se pudo cargar la disponibilidad"));
  }, [date]);

  useEffect(() => {
    load();
  }, [load]);

  const ownReservation = reservations?.find((r) => r.userId === user?.id) ?? null;
  const reservationBySeat = new Map((reservations ?? []).map((r) => [r.seatNumber, r]));

  async function handleReserve(seatNumber: number) {
    setError(null);
    setIsSaving(true);
    try {
      await reserveSeat({ date, seatNumber });
      load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "No se pudo reservar el asiento");
    } finally {
      setIsSaving(false);
    }
  }

  async function handleCancel(id: string) {
    setError(null);
    try {
      await cancelSeatReservation(id);
      load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "No se pudo cancelar la reserva");
    } finally {
      setCancellingId(null);
    }
  }

  return (
    <div className="dashboard-grid">
      <h2>Reservar sitio</h2>
      {error && <div className="error-banner">{error}</div>}

      <div className="card">
        <label>
          <span>Día</span>
          <input
            type="date"
            min={todayDateString()}
            value={date}
            onChange={(e) => setDate(e.target.value)}
          />
        </label>

        {!reservations && <p>Cargando…</p>}

        {reservations && (
          <>
            <p style={{ fontSize: "0.85rem", color: "var(--color-text-muted)" }}>
              {ownReservation
                ? `Tienes el asiento ${ownReservation.seatNumber} reservado ese día.`
                : "Todavía no tienes ningún asiento reservado ese día."}
            </p>
            <div className="seat-grid">
              {Array.from({ length: totalSeats }, (_, i) => i + 1).map((seatNumber) => {
                const reservation = reservationBySeat.get(seatNumber);
                const isMine = reservation?.userId === user?.id;
                const isTaken = reservation !== undefined;
                return (
                  <button
                    key={seatNumber}
                    type="button"
                    className={`seat-grid__seat${isMine ? " seat-grid__seat--mine" : ""}${isTaken && !isMine ? " seat-grid__seat--taken" : ""}`}
                    disabled={isSaving || (isTaken && !isMine) || (!isMine && ownReservation !== null)}
                    title={isTaken && !isMine ? reservation.userFullName : undefined}
                    onClick={() => (isMine ? setCancellingId(reservation!.id) : handleReserve(seatNumber))}
                  >
                    {seatNumber}
                  </button>
                );
              })}
            </div>
          </>
        )}
      </div>

      {cancellingId && (
        <ConfirmDialog
          title="Cancelar reserva"
          message="¿Cancelar tu reserva de asiento para ese día?"
          confirmLabel="Cancelar reserva"
          onConfirm={() => handleCancel(cancellingId)}
          onCancel={() => setCancellingId(null)}
        />
      )}
    </div>
  );
}
