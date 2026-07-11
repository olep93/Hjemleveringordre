"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { AppHeader } from "@/components/app-header";
import {
  ArrowLeft,
  Box,
  CalendarDays,
  Camera,
  Check,
  CheckCircle2,
  ExternalLink,
  FileSearch,
  FileText,
  Info,
  MapPin,
  PackageCheck,
  Pencil,
  Play,
  Trash2,
  Truck,
  UserRound
} from "lucide-react";
import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";

type BlobReference = {
  pathname?: string;
  filename?: string;
};

type Item = {
  id: string;
  articleNumber?: string | null;
  bestNumber?: string | null;
  description: string;
  productName?: string | null;
  productUrl?: string | null;
  productImageBlob?: BlobReference | null;
  productImageUrl?: string | null;
  productLookupStatus?: string | null;
  quantity: number;
  unit?: string | null;
  price?: number | null;
  checked: boolean;
  checkedBy?: string | null;
  isFreight?: boolean;
};

type Order = {
  id: string;
  title: string;
  orderNumber?: string | null;
  customerName?: string | null;
  phone?: string | null;
  deliveryDate?: string | null;
  createdAt?: string | null;
  status: string;
  placement?: string | null;
  pickedBy?: string | null;
  comment?: string | null;
  originalDocumentUrl?: string | null;
  originalDocumentPath?: string | null;
  originalDocumentBlob?: BlobReference | null;
  items?: Item[];
  photos?: Array<{
    filename?: string;
    uploadedBy?: string;
    createdAt?: string;
    url?: string | null;
  }>;
  events?: Array<{
    id: string;
    description?: string;
    actorName?: string;
    createdAt?: string | null;
  }>;
};

function formatDate(value?: string | null): string {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("nb-NO", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric"
  }).format(date);
}

function formatDateTime(value?: string | null): string {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return new Intl.DateTimeFormat("nb-NO", {
    day: "numeric",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  }).format(date);
}

function formatPrice(value?: number | null): string {
  if (value === null || value === undefined || Number.isNaN(value)) return "";
  return new Intl.NumberFormat("nb-NO", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(value);
}

export default function OrderPage({
  initialUser
}: {
  initialUser: { displayName: string; role: string };
}) {
  const params = useParams<{ id: string }>();
  const id = params.id;

  const [order, setOrder] = useState<Order | null>(null);
  const [actorName, setActorName] = useState(
    initialUser.role === "GUEST" ? "" : initialUser.displayName
  );
  const [orderNumber, setOrderNumber] = useState("");
  const [customerName, setCustomerName] = useState("");
  const [phone, setPhone] = useState("");
  const [placement, setPlacement] = useState("");
  const [deliveryDate, setDeliveryDate] = useState("");
  const [comment, setComment] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const canEdit = initialUser.role !== "GUEST";
  const canDelete =
    initialUser.role === "ADMIN" || initialUser.role === "MANAGER";

  const load = useCallback(async () => {
    const response = await fetch(`/api/orders/${id}`, { cache: "no-store" });
    const result = await response.json();

    if (!response.ok) {
      throw new Error(result.error ?? "Kunne ikke hente ordre.");
    }

    setOrder(result.order);
    setOrderNumber(result.order.orderNumber ?? "");
    setCustomerName(result.order.customerName ?? "");
    setPhone(result.order.phone ?? "");
    setPlacement(result.order.placement ?? "");
    setDeliveryDate(result.order.deliveryDate ?? "");
    setComment(result.order.comment ?? "");
  }, [id]);

  useEffect(() => {
    void load().catch((loadError) =>
      setError(
        loadError instanceof Error ? loadError.message : "Kunne ikke hente ordre."
      )
    );
  }, [load]);

  const progress = useMemo(() => {
    const pluckable = (order?.items ?? []).filter((item) => !item.isFreight);
    return {
      checked: pluckable.filter((item) => item.checked).length,
      total: pluckable.length
    };
  }, [order]);

  async function update(status?: string) {
    if (!canEdit) return setError("Gjestetilgang er skrivebeskyttet.");
    if (!actorName.trim()) return setError("Skriv inn navnet ditt først.");

    setSaving(true);
    setError(null);
    setInfo(null);

    try {
      const response = await fetch(`/api/orders/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status,
          actorName,
          orderNumber: orderNumber || null,
          customerName: customerName || null,
          phone: phone || null,
          placement: placement || null,
          deliveryDate: deliveryDate || null,
          comment: comment || null
        })
      });

      const result = await response.json();
      if (!response.ok) throw new Error(result.error ?? "Kunne ikke oppdatere.");

      setInfo(status ? "Statusen er oppdatert." : "Endringene er lagret.");
      await load();
    } catch (updateError) {
      setError(
        updateError instanceof Error
          ? updateError.message
          : "Kunne ikke oppdatere."
      );
    } finally {
      setSaving(false);
    }
  }

  async function reparse() {
    if (!canEdit) return setError("Gjestetilgang er skrivebeskyttet.");

    setSaving(true);
    setError(null);
    setInfo("Tolker PDF og henter oppdatert produktinformasjon fra Obsbygg.no …");

    try {
      const response = await fetch(`/api/orders/${id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "REPARSE", actorName })
      });

      const result = await response.json();
      if (!response.ok) {
        throw new Error(result.error ?? "Kunne ikke tolke dokumentet på nytt.");
      }

      setInfo(
        `Ferdig. Fant ${result.itemCount ?? 0} varelinjer og oppdaterte produktinformasjonen.`
      );
      await load();
    } catch (parseError) {
      setInfo(null);
      setError(
        parseError instanceof Error
          ? parseError.message
          : "Kunne ikke tolke dokumentet."
      );
    } finally {
      setSaving(false);
    }
  }

  async function toggleItem(item: Item) {
    if (!canEdit) return setError("Gjestetilgang er skrivebeskyttet.");
    if (!actorName.trim()) {
      return setError("Skriv inn navnet ditt før du krysser av varer.");
    }

    const response = await fetch(
      `/api/orders/${id}/items/${encodeURIComponent(item.id)}`,
      {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ checked: !item.checked, actorName })
      }
    );

    const result = await response.json();
    if (!response.ok) {
      return setError(result.error ?? "Kunne ikke oppdatere varelinjen.");
    }

    await load();
  }

  async function uploadPhoto(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!canEdit) return setError("Gjestetilgang er skrivebeskyttet.");

    const formElement = event.currentTarget;
    const form = new FormData(formElement);
    form.set("uploadedBy", actorName);
    setSaving(true);

    try {
      const response = await fetch(`/api/orders/${id}/photos`, {
        method: "POST",
        body: form
      });
      const result = await response.json();
      if (!response.ok) {
        throw new Error(result.error ?? "Kunne ikke laste opp bilde.");
      }
      formElement.reset();
      await load();
    } catch (uploadError) {
      setError(
        uploadError instanceof Error
          ? uploadError.message
          : "Kunne ikke laste opp bilde."
      );
    } finally {
      setSaving(false);
    }
  }

  async function deleteOrder() {
    if (!canDelete) {
      return setError("Bare leder eller administrator kan slette ordre.");
    }
    if (!window.confirm("Vil du slette denne ordren permanent?")) return;

    setSaving(true);
    setError(null);

    try {
      const response = await fetch(`/api/orders/${id}`, { method: "DELETE" });
      const result = await response.json();
      if (!response.ok) {
        throw new Error(result.error ?? "Kunne ikke slette ordren.");
      }
      window.location.assign("/?deleted=1");
    } catch (deleteError) {
      setError(
        deleteError instanceof Error
          ? deleteError.message
          : "Kunne ikke slette ordren."
      );
      setSaving(false);
    }
  }

  return (
    <main>
      <AppHeader user={initialUser} />

      {!order ? (
        <section className="modern-order-page">
          <div className="modern-card">
            {error ? <div className="error-box">{error}</div> : "Henter ordre …"}
          </div>
        </section>
      ) : (
        <section className="modern-order-page">
          <div className="order-titlebar">
            <div>
              <Link className="modern-back-link" href="/">
                <ArrowLeft size={18} /> Tilbake til oversikt
              </Link>
              <div className="title-line">
                <h1>
                  {orderNumber
                    ? `Kundeordre ${orderNumber}${
                        customerName ? ` – ${customerName}` : ""
                      }`
                    : "Ny ordre – må kontrolleres"}
                </h1>
                <span className="status-chip">{order.status}</span>
              </div>
              {order.createdAt && (
                <p className="created-line">
                  <CalendarDays size={16} />
                  Opprettet {formatDateTime(order.createdAt)}
                </p>
              )}
            </div>

            <div className="title-actions">
              {order.originalDocumentUrl && (
                <a
                  className="outline-action"
                  href={order.originalDocumentUrl}
                  target="_blank"
                  rel="noreferrer"
                >
                  <FileText size={18} /> Åpne original ordre
                  <ExternalLink size={15} />
                </a>
              )}

              {canEdit &&
                (order.originalDocumentBlob?.pathname ||
                  order.originalDocumentPath) && (
                  <button
                    className="blue-action"
                    disabled={saving}
                    onClick={() => void reparse()}
                  >
                    <FileSearch size={18} />
                    {saving ? "Arbeider …" : "Tolk og oppdater produktinfo"}
                  </button>
                )}
            </div>
          </div>

          {initialUser.role === "GUEST" && (
            <div className="guest-notice">
              Du ser ordren som gjest. Logg inn for å plukke eller redigere.
            </div>
          )}

          <div className="modern-detail-grid">
            <section className="modern-card order-information-card">
              <div className="modern-card-title">
                <span className="title-icon"><ClipboardIcon /></span>
                <h2>Ordreinformasjon</h2>
              </div>

              <div className="modern-form-grid">
                <label>
                  Kundeordrenummer
                  <input
                    value={orderNumber}
                    onChange={(event) => setOrderNumber(event.target.value)}
                    disabled={!canEdit}
                  />
                </label>
                <label>
                  Kundenavn
                  <input
                    value={customerName}
                    onChange={(event) => setCustomerName(event.target.value)}
                    disabled={!canEdit}
                  />
                </label>
                <label>
                  Telefon
                  <div className="input-with-icon">
                    <UserRound size={17} />
                    <input
                      value={phone}
                      onChange={(event) => setPhone(event.target.value)}
                      disabled={!canEdit}
                      placeholder="Telefonnummer"
                    />
                  </div>
                </label>
                <label>
                  Navnet ditt
                  <div className="input-with-icon">
                    <UserRound size={17} />
                    <input
                      value={actorName}
                      onChange={(event) => setActorName(event.target.value)}
                      disabled={!canEdit}
                    />
                  </div>
                </label>
                <label>
                  Leveringsdato
                  <input
                    type="date"
                    value={deliveryDate}
                    onChange={(event) => setDeliveryDate(event.target.value)}
                    disabled={!canEdit}
                  />
                </label>
                <label>
                  Plassering
                  <div className="input-with-icon">
                    <MapPin size={17} />
                    <select
                      value={placement}
                      onChange={(event) => setPlacement(event.target.value)}
                      disabled={!canEdit}
                    >
                      <option value="">Velg plassering</option>
                      <option>Utvendig betong</option>
                      <option>Varemottak Drive-In</option>
                      <option>Kasse Drive-In</option>
                    </select>
                  </div>
                </label>
                <label className="full">
                  Kommentar
                  <textarea
                    rows={3}
                    value={comment}
                    onChange={(event) => setComment(event.target.value)}
                    disabled={!canEdit}
                    placeholder="Legg til kommentar …"
                  />
                </label>
              </div>

              {error && <div className="error-box">{error}</div>}
              {info && <div className="info-message">{info}</div>}

              {canEdit && (
                <div className="modern-action-grid">
                  <button
                    className="blue-action"
                    disabled={saving}
                    onClick={() => void update("PICKING")}
                  >
                    <Play size={18} /> Start plukking
                  </button>
                  <button
                    className="green-action"
                    disabled={saving}
                    onClick={() => void update("READY_FOR_LOADING")}
                  >
                    <CheckCircle2 size={18} /> Klar for lasting
                  </button>
                  <button
                    className="outline-action"
                    disabled={saving}
                    onClick={() => void update("LOADED")}
                  >
                    <Truck size={18} /> Lastet på bil
                  </button>
                  <button
                    className="outline-action"
                    disabled={saving}
                    onClick={() => void update()}
                  >
                    <Pencil size={18} /> Lagre endringer
                  </button>
                </div>
              )}

              <div className="danger-document-row">
                {canDelete && (
                  <button
                    className="modern-danger-button"
                    disabled={saving}
                    onClick={() => void deleteOrder()}
                  >
                    <Trash2 size={18} /> Slett ordre permanent
                  </button>
                )}
                {order.originalDocumentUrl && (
                  <a
                    className="outline-action"
                    href={order.originalDocumentUrl}
                    target="_blank"
                    rel="noreferrer"
                  >
                    <FileText size={18} /> Åpne original ordre
                  </a>
                )}
              </div>
            </section>

            <section className="modern-card picking-card">
              <div className="modern-card-title picking-title">
                <span className="title-icon outline"><Box size={23} /></span>
                <h2>Plukkeliste</h2>
                <span className="modern-progress-pill">
                  {progress.checked} / {progress.total} plukket
                </span>
              </div>

              <div className="modern-item-list">
                {(order.items ?? []).length === 0 ? (
                  <div className="empty-state">
                    Ingen varelinjer ble tolket. Bruk «Tolk og oppdater
                    produktinfo».
                  </div>
                ) : (
                  (order.items ?? []).map((item) => (
                    <article
                      className={`modern-product-row ${
                        item.checked ? "checked" : ""
                      }`}
                      key={item.id}
                    >
                      <button
                        className="product-checkbox"
                        type="button"
                        onClick={() =>
                          canEdit && !item.isFreight && void toggleItem(item)
                        }
                        disabled={!canEdit || item.isFreight}
                        aria-label={
                          item.checked ? "Marker som ikke plukket" : "Marker som plukket"
                        }
                      >
                        {item.checked && <Check size={18} />}
                      </button>

                      <div className="product-image-wrap">
                        {item.productImageUrl ? (
                          <img
                            src={item.productImageUrl}
                            alt={item.productName ?? item.description}
                          />
                        ) : (
                          <Box size={32} />
                        )}
                      </div>

                      <div className="product-description">
                        <div className="product-name-line">
                          {item.productUrl ? (
                            <a
                              href={item.productUrl}
                              target="_blank"
                              rel="noreferrer"
                            >
                              {item.productName ?? item.description}
                              <ExternalLink size={14} />
                            </a>
                          ) : (
                            <strong>{item.productName ?? item.description}</strong>
                          )}
                        </div>
                        {item.productName && (
                          <p>Ordretekst: {item.description}</p>
                        )}
                        <div className="product-tags">
                          {item.articleNumber && (
                            <span>EAN {item.articleNumber}</span>
                          )}
                          {item.bestNumber && (
                            <span>Best.nr {item.bestNumber}</span>
                          )}
                        </div>
                      </div>

                      <div className="product-quantity">
                        <strong>
                          {item.quantity} {item.unit ?? "stk"}
                        </strong>
                        {item.price !== null && item.price !== undefined && (
                          <span>à {formatPrice(item.price)}</span>
                        )}
                        <em>{item.checked ? "Plukket" : "Ikke plukket"}</em>
                      </div>
                    </article>
                  ))
                )}
              </div>

              <div className="picking-help">
                <Info size={18} />
                Huk av når varen er plukket. Fremdriften lagres automatisk.
              </div>
            </section>
          </div>

          <div className="lower-grid">
            <section className="modern-card">
              <div className="modern-card-title">
                <span className="title-icon"><Camera size={21} /></span>
                <h2>Bilder av ferdig ordre</h2>
              </div>
              {canEdit && (
                <form className="modern-photo-form" onSubmit={uploadPhoto}>
                  <input
                    name="file"
                    type="file"
                    accept="image/*"
                    capture="environment"
                    required
                  />
                  <button className="blue-action" disabled={saving}>
                    <Camera size={18} /> Last opp bilde
                  </button>
                </form>
              )}
              <div className="photo-grid">
                {(order.photos ?? []).map((photo, index) =>
                  photo.url ? (
                    <figure key={index}>
                      <img src={photo.url} alt={photo.filename ?? "Ordrebilde"} />
                      <figcaption>{photo.uploadedBy ?? "Ukjent"}</figcaption>
                    </figure>
                  ) : null
                )}
              </div>
            </section>

            <section className="modern-card">
              <div className="modern-card-title">
                <span className="title-icon"><PackageCheck size={21} /></span>
                <h2>Historikk</h2>
              </div>
              <div className="timeline">
                {(order.events ?? []).map((event) => (
                  <div className="timeline-item" key={event.id}>
                    <MapPin size={16} />
                    <div>
                      <strong>{event.description ?? "Hendelse"}</strong>
                      <p>{formatDateTime(event.createdAt)}</p>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          </div>
        </section>
      )}
    </main>
  );
}

function ClipboardIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
      <path d="M8 5h8M9 3h6a1 1 0 0 1 1 1v2H8V4a1 1 0 0 1 1-1Z" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
      <rect x="5" y="5" width="14" height="16" rx="2.5" stroke="currentColor" strokeWidth="1.8"/>
      <path d="M9 11h6M9 15h6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
    </svg>
  );
}
