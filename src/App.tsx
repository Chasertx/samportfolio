import { useMemo, useState } from 'react'
import type { FormEvent } from 'react'
import emailjs from '@emailjs/browser'
import './App.css'

type ExperienceItem = {
  role: string
  company: string
  location: string
  period: string
  summary: string
}

type EducationItem = {
  degree: string
  school: string
  date: string
}

type PatentDoc = {
  title: string
  fileName: string
  status: 'available' | 'pending-upload'
  href?: string
}

type AppointmentForm = {
  name: string
  email: string
  topic: string
  date: string
  time: string
  durationMinutes: number
  mode: 'Video Call' | 'Phone' | 'In Person'
  notes: string
}

const experiences: ExperienceItem[] = [
  {
    role: 'Independent Contractor',
    company: 'Self-Employed',
    location: 'Acworth, GA',
    period: 'Nov 2023 - Present',
    summary:
      'Driving technical sales growth through consultative prospecting, relationship management, solution pitching, and close execution in commission-based environments.',
  },
  {
    role: 'Technical Sales Consultant',
    company: 'Georgia Western',
    location: 'Kennesaw, GA',
    period: 'Jan 2023 - Nov 2023',
    summary:
      'Delivered actuator solutions for utility and municipal clients, converting complex industrial requirements into clear, decision-ready recommendations.',
  },
  {
    role: 'Electrical Testing Technician',
    company: 'Emerson',
    location: 'Kennesaw, GA',
    period: 'Mar 2021 - Dec 2021',
    summary:
      'Built and validated industrial control panels to specification, updated schematics, and coordinated production and customer-facing priorities across teams.',
  },
  {
    role: 'Data Center Facilities Technician Intern',
    company: 'Google Inc',
    location: 'Data Center Operations',
    period: 'May 2015 - Aug 2015',
    summary:
      'Supported day-to-day electrical and water system maintenance and acted as point of contact for smaller contractor projects.',
  },
]

const education: EducationItem[] = [
  {
    degree: 'B.S. in Electrical Engineering Technology',
    school: 'Kennesaw State University',
    date: 'Dec 2018',
  },
]

const certifications = ['Registered E.I.T. (Georgia Department of Engineering and Land Surveyors)']

const patentDocuments: PatentDoc[] = [
  {
    title: 'Method and System for Mounting Photovoltaic Cells (Revised)',
    fileName: 'Method and System for Mounting Photovoltaic Cells revised.docx',
    status: 'pending-upload',
  },
]

const highlights = [
  'Registered E.I.T. in Georgia',
  "Co-author: BIOENG'18 prosthetics research paper",
  'Hands-on background across power, data center, and industrial controls',
  'Technical sales + engineering communication for complex systems',
]

const initialAppointmentForm: AppointmentForm = {
  name: '',
  email: '',
  topic: '',
  date: '',
  time: '',
  durationMinutes: 30,
  mode: 'Video Call',
  notes: '',
}

const EMAILJS_SERVICE_ID = import.meta.env.VITE_EMAILJS_SERVICE_ID
const EMAILJS_TEMPLATE_ID = import.meta.env.VITE_EMAILJS_TEMPLATE_ID
const EMAILJS_PUBLIC_KEY = import.meta.env.VITE_EMAILJS_PUBLIC_KEY
const SCHEDULER_URL = import.meta.env.VITE_SCHEDULER_URL?.trim() || 'https://calendly.com/'
const TARGET_EMAIL = 'Samuelkatz2000@gmail.com'
const hasThirdPartyScheduler = Boolean(SCHEDULER_URL)

function calendarTimeRange(date: string, time: string, durationMinutes: number) {
  const startDate = new Date(`${date}T${time}:00`)
  const endDate = new Date(startDate)
  endDate.setMinutes(endDate.getMinutes() + durationMinutes)

  return {
    startUTC: startDate.toISOString(),
    endUTC: endDate.toISOString(),
    startStamp: startDate.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, ''),
    endStamp: endDate.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, ''),
  }
}

function escapeICS(value: string): string {
  return value
    .replace(/\\/g, '\\\\')
    .replace(/,/g, '\\,')
    .replace(/;/g, '\\;')
    .replace(/\n/g, '\\n')
}

function createICSFile(form: AppointmentForm): Blob {
  const timeRange = calendarTimeRange(form.date, form.time, form.durationMinutes)
  const summary = form.topic || 'Meeting with Samuel Katz'
  const description = [
    `Requested by: ${form.name}`,
    `Email: ${form.email}`,
    `Format: ${form.mode}`,
    form.notes ? `Notes: ${form.notes}` : '',
  ]
    .filter(Boolean)
    .join('\n')

  const ics = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Samuel Katz Portfolio//EN',
    'BEGIN:VEVENT',
    `UID:${Date.now()}@samuelkatz-portfolio`,
    `DTSTAMP:${new Date().toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '')}`,
    `DTSTART:${timeRange.startStamp}`,
    `DTEND:${timeRange.endStamp}`,
    `SUMMARY:${escapeICS(summary)}`,
    `DESCRIPTION:${escapeICS(description)}`,
    `LOCATION:${escapeICS(form.mode)}`,
    'END:VEVENT',
    'END:VCALENDAR',
  ].join('\r\n')

  return new Blob([ics], { type: 'text/calendar;charset=utf-8' })
}

function getGoogleCalendarUrl(form: AppointmentForm): string {
  const timeRange = calendarTimeRange(form.date, form.time, form.durationMinutes)
  const details = [
    `Requested by: ${form.name}`,
    `Email: ${form.email}`,
    `Mode: ${form.mode}`,
    form.notes ? `Notes: ${form.notes}` : '',
  ]
    .filter(Boolean)
    .join('\n')

  const params = new URLSearchParams({
    action: 'TEMPLATE',
    text: form.topic || 'Meeting with Samuel Katz',
    dates: `${timeRange.startStamp}/${timeRange.endStamp}`,
    details,
    location: form.mode,
  })

  return `https://calendar.google.com/calendar/render?${params.toString()}`
}

function getOutlookCalendarUrl(form: AppointmentForm): string {
  const timeRange = calendarTimeRange(form.date, form.time, form.durationMinutes)
  const params = new URLSearchParams({
    path: '/calendar/action/compose',
    rru: 'addevent',
    subject: form.topic || 'Meeting with Samuel Katz',
    startdt: timeRange.startUTC,
    enddt: timeRange.endUTC,
    body: `${form.notes || 'Portfolio conversation'}\n\nRequested by: ${form.name} (${form.email})`,
    location: form.mode,
  })

  return `https://outlook.live.com/calendar/0/deeplink/compose?${params.toString()}`
}

function HomePage() {
  const scheduleHref = hasThirdPartyScheduler ? (SCHEDULER_URL as string) : '/schedule'

  return (
    <div className="page-shell">
      <div className="top-utility-bar">
        <span>Available for technical consulting and engineering conversations</span>
        <a
          className="schedule-button"
          href={scheduleHref}
          target={hasThirdPartyScheduler ? '_blank' : undefined}
          rel={hasThirdPartyScheduler ? 'noreferrer noopener' : undefined}
        >
          Schedule a Call
        </a>
      </div>

      <header className="hero">
        <p className="eyebrow">Electrical Engineering Technologist</p>
        <h1>Samuel Katz</h1>
        <p className="hero-copy">
          Bridging engineering depth and technical sales execution across industrial controls, utility
          applications, and applied innovation.
        </p>
        <div className="hero-meta">
          {highlights.map((item) => (
            <span key={item}>{item}</span>
          ))}
        </div>
      </header>

      <main>
        <section className="section-grid">
          <article className="panel large">
            <h2>Selected Experience</h2>
            <div className="timeline">
              {experiences.map((item) => (
                <div key={`${item.role}-${item.company}`} className="timeline-item">
                  <div className="timeline-header">
                    <h3>{item.role}</h3>
                    <p>{item.period}</p>
                  </div>
                  <p className="timeline-subtitle">
                    {item.company} | {item.location}
                  </p>
                  <p>{item.summary}</p>
                </div>
              ))}
            </div>
          </article>

          <article className="panel">
            <h2>Education & Credentials</h2>
            <div className="stack-list">
              {education.map((item) => (
                <div key={item.degree} className="stack-item">
                  <h3>{item.degree}</h3>
                  <p>{item.school}</p>
                  <p>{item.date}</p>
                </div>
              ))}
            </div>
            <h3 className="subheading">Certifications</h3>
            <ul className="plain-list">
              {certifications.map((certification) => (
                <li key={certification}>{certification}</li>
              ))}
            </ul>
          </article>
        </section>

        <section className="section-grid">
          <article className="panel">
            <h2>Research Highlight</h2>
            <h3>Control of Articulated Mechanical Prosthetics</h3>
            <p className="muted">International Conference on Biomedical Engineering and Sciences (BIOENG'18)</p>
            <p>
              Co-authored and helped prototype a biomimetic prosthetic hand integrating myoelectric
              sensors with EEG-assisted control logic using Arduino-based hardware and signal-processing
              workflows.
            </p>
          </article>

          <article className="panel">
            <h2>Patent Documents</h2>
            <div className="stack-list">
              {patentDocuments.map((doc) => (
                <div key={doc.fileName} className="stack-item patent-item">
                  <h3>{doc.title}</h3>
                  <p>{doc.fileName}</p>
                  {doc.status === 'available' && doc.href ? (
                    <a href={doc.href} target="_blank" rel="noreferrer" className="button-link">
                      Open Document
                    </a>
                  ) : (
                    <p className="status-pill">Pending upload to public/docs</p>
                  )}
                </div>
              ))}
            </div>
          </article>
        </section>

        <section className="contact-modern" id="contact">
          <h2>Contact</h2>
          <p className="muted">If you are hiring, collaborating, or discussing a technical project, I would like to connect.</p>
          <div className="contact-grid">
            <a className="contact-card" href="mailto:Samuelkatz2000@gmail.com">
              <span className="contact-label">Email</span>
              <strong>Samuelkatz2000@gmail.com</strong>
            </a>
            <a className="contact-card" href="tel:+17703556295">
              <span className="contact-label">Phone</span>
              <strong>+1 (770) 355-6295</strong>
            </a>
            <div className="contact-card">
              <span className="contact-label">Location</span>
              <strong>Acworth, Georgia</strong>
            </div>
          </div>
        </section>
      </main>

      <footer className="footer">
        <p>Samuel Katz</p>
        <a href="mailto:Samuelkatz2000@gmail.com">Samuelkatz2000@gmail.com</a>
        <a href="tel:+17703556295">+1 (770) 355-6295</a>
      </footer>
    </div>
  )
}

function SchedulePage() {
  if (hasThirdPartyScheduler) {
    return (
      <div className="page-shell schedule-page-shell">
        <div className="top-utility-bar">
          <span>Appointment Scheduling</span>
          <a className="schedule-button" href="/">
            Back to Portfolio
          </a>
        </div>

        <section className="panel schedule-page">
          <h1>Schedule an Appointment</h1>
          <p className="muted">
            This site is configured with a third-party scheduler. Use the button below to book directly.
          </p>
          <a
            className="schedule-button action-button"
            href={SCHEDULER_URL as string}
            target="_blank"
            rel="noreferrer noopener"
          >
            Open Scheduler
          </a>
        </section>
      </div>
    )
  }

  const [form, setForm] = useState<AppointmentForm>(initialAppointmentForm)
  const [created, setCreated] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [emailStatus, setEmailStatus] = useState<'idle' | 'sent' | 'failed' | 'config-missing'>('idle')

  const googleUrl = useMemo(() => {
    if (!form.date || !form.time) {
      return ''
    }
    return getGoogleCalendarUrl(form)
  }, [form])

  const outlookUrl = useMemo(() => {
    if (!form.date || !form.time) {
      return ''
    }
    return getOutlookCalendarUrl(form)
  }, [form])

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setIsSubmitting(true)

    const isEmailConfigured =
      Boolean(EMAILJS_SERVICE_ID) && Boolean(EMAILJS_TEMPLATE_ID) && Boolean(EMAILJS_PUBLIC_KEY)

    if (isEmailConfigured) {
      const serviceId = EMAILJS_SERVICE_ID as string
      const templateId = EMAILJS_TEMPLATE_ID as string
      const publicKey = EMAILJS_PUBLIC_KEY as string

      try {
        await emailjs.send(
          serviceId,
          templateId,
          {
            to_email: TARGET_EMAIL,
            from_name: form.name,
            from_email: form.email,
            subject: form.topic,
            preferred_date: form.date,
            preferred_time: form.time,
            duration_minutes: String(form.durationMinutes),
            meeting_mode: form.mode,
            notes: form.notes || 'No additional notes provided.',
          },
          {
            publicKey,
          },
        )
        setEmailStatus('sent')
      } catch {
        setEmailStatus('failed')
      }
    } else {
      setEmailStatus('config-missing')
    }

    setCreated(true)

    const icsBlob = createICSFile(form)
    const downloadLink = document.createElement('a')
    downloadLink.href = URL.createObjectURL(icsBlob)
    downloadLink.download = 'samuel-katz-appointment.ics'
    downloadLink.click()
    URL.revokeObjectURL(downloadLink.href)

    window.open(getGoogleCalendarUrl(form), '_blank', 'noopener,noreferrer')
    setIsSubmitting(false)
  }

  return (
    <div className="page-shell schedule-page-shell">
      <div className="top-utility-bar">
        <span>Appointment Scheduling</span>
        <a className="schedule-button" href="/">
          Back to Portfolio
        </a>
      </div>

      <section className="panel schedule-page">
        <h1>Schedule an Appointment</h1>
        <p className="muted">
          Submit once to auto-generate a calendar event. This will open Google Calendar and download an
          .ics file for Apple Calendar and Outlook.
        </p>

        <form className="schedule-form" onSubmit={handleSubmit}>
          <label>
            Your Name
            <input
              required
              type="text"
              value={form.name}
              onChange={(event) => setForm((previous) => ({ ...previous, name: event.target.value }))}
            />
          </label>

          <label>
            Your Email
            <input
              required
              type="email"
              value={form.email}
              onChange={(event) => setForm((previous) => ({ ...previous, email: event.target.value }))}
            />
          </label>

          <label>
            Topic
            <input
              required
              type="text"
              value={form.topic}
              onChange={(event) => setForm((previous) => ({ ...previous, topic: event.target.value }))}
            />
          </label>

          <label>
            Preferred Format
            <select
              value={form.mode}
              onChange={(event) =>
                setForm((previous) => ({
                  ...previous,
                  mode: event.target.value as AppointmentForm['mode'],
                }))
              }
            >
              <option>Video Call</option>
              <option>Phone</option>
              <option>In Person</option>
            </select>
          </label>

          <label>
            Date
            <input
              required
              type="date"
              value={form.date}
              onChange={(event) => setForm((previous) => ({ ...previous, date: event.target.value }))}
            />
          </label>

          <label>
            Time
            <input
              required
              type="time"
              value={form.time}
              onChange={(event) => setForm((previous) => ({ ...previous, time: event.target.value }))}
            />
          </label>

          <label>
            Duration (minutes)
            <select
              value={form.durationMinutes}
              onChange={(event) =>
                setForm((previous) => ({ ...previous, durationMinutes: Number(event.target.value) }))
              }
            >
              <option value={30}>30</option>
              <option value={45}>45</option>
              <option value={60}>60</option>
            </select>
          </label>

          <label className="full-width">
            Notes
            <textarea
              rows={4}
              value={form.notes}
              onChange={(event) => setForm((previous) => ({ ...previous, notes: event.target.value }))}
            />
          </label>

          <button type="submit" className="schedule-button full-width action-button" disabled={isSubmitting}>
            Create Appointment and Add to Calendar
          </button>
        </form>

        {emailStatus === 'sent' ? (
          <p className="status-text status-success">Appointment email sent to Samuel successfully.</p>
        ) : null}
        {emailStatus === 'failed' ? (
          <p className="status-text status-error">
            Could not send the email automatically. Calendar links were still generated.
          </p>
        ) : null}
        {emailStatus === 'config-missing' ? (
          <p className="status-text status-warning">
            Email delivery is not configured yet. Add EmailJS environment values to enable auto-delivery.
          </p>
        ) : null}

        {created ? (
          <div className="calendar-links">
            <a className="button-link" href={googleUrl} target="_blank" rel="noreferrer">
              Open in Google Calendar
            </a>
            <a className="button-link" href={outlookUrl} target="_blank" rel="noreferrer">
              Open in Outlook Web
            </a>
          </div>
        ) : null}
      </section>
    </div>
  )
}

function App() {
  if (window.location.pathname === '/schedule') {
    return <SchedulePage />
  }

  return <HomePage />
}

export default App
