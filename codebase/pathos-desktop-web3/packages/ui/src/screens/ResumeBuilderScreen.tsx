/**
 * ============================================================================
 * RESUME BUILDER SCREEN -- Two-pane editor + live preview
 * ============================================================================
 *
 * BOUNDARY RULE: This file MUST NOT import from next/* or electron/*.
 *
 * TRUST-FIRST: All data local only. User controls every field.
 */

'use client';

import type React from 'react';
import { useState, useEffect, useCallback } from 'react';
import {
  FileText,
  Save,
  RotateCcw,
  Trash2,
  Plus,
  Eye,
  EyeOff,
  Clock,
  ChevronDown,
  ChevronUp,
  ShieldCheck,
} from 'lucide-react';
import {
  loadResumeStore,
  saveResumeStore,
  updateDraft,
  createVersion,
  restoreVersion,
  deleteVersion,
  listVersions,
  createDefaultDraft,
} from '@pathos/core';
import type {
  ResumeStore,
  ResumeDraft,
  ResumeContact,
  ResumeExperience,
  ResumeEducation,
  ResumeSkill,
} from '@pathos/core';

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

/** Props for ResumeBuilderScreen; currently no required props. */
export type ResumeBuilderScreenProps = Record<string, unknown>;

// ---------------------------------------------------------------------------
// Helper: generate IDs
// ---------------------------------------------------------------------------

function genId(): string {
  return 're-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 6);
}

// ---------------------------------------------------------------------------
// Sub-component: Collapsible section
// ---------------------------------------------------------------------------

function Section(props: {
  title: string;
  children: React.ReactNode;
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(props.defaultOpen ?? true);
  return (
    <div
      className="mb-4"
      style={{
        border: '1px solid var(--p-border)',
        borderRadius: 'var(--p-radius-lg)',
        overflow: 'hidden',
      }}
    >
      <button
        type="button"
        onClick={function () { setOpen(!open); }}
        className="w-full flex items-center justify-between px-4 py-3 text-sm font-semibold"
        style={{ background: 'var(--p-surface2)', color: 'var(--p-text)' }}
      >
        {props.title}
        {open ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
      </button>
      {open && (
        <div className="px-4 py-3 space-y-3" style={{ background: 'var(--p-surface)' }}>
          {props.children}
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Sub-component: Field
// ---------------------------------------------------------------------------

function Field(props: {
  label: string;
  value: string;
  onChange: (val: string) => void;
  type?: 'text' | 'textarea';
  placeholder?: string;
}) {
  return (
    <label className="block">
      <span className="text-xs font-medium mb-1 block" style={{ color: 'var(--p-text-dim)' }}>{props.label}</span>
      {props.type === 'textarea' ? (
        <textarea
          value={props.value}
          onChange={function (e) { props.onChange(e.target.value); }}
          placeholder={props.placeholder}
          rows={3}
          className="w-full text-sm px-3 py-2 resize-y outline-none"
          style={{
            background: 'var(--p-surface2)',
            border: '1px solid var(--p-border)',
            borderRadius: 'var(--p-radius)',
            color: 'var(--p-text)',
          }}
        />
      ) : (
        <input
          type="text"
          value={props.value}
          onChange={function (e) { props.onChange(e.target.value); }}
          placeholder={props.placeholder}
          className="w-full text-sm px-3 py-2 outline-none"
          style={{
            background: 'var(--p-surface2)',
            border: '1px solid var(--p-border)',
            borderRadius: 'var(--p-radius)',
            color: 'var(--p-text)',
          }}
        />
      )}
    </label>
  );
}

// ---------------------------------------------------------------------------
// Sub-component: Live preview pane
// ---------------------------------------------------------------------------

function ResumePreview(props: { draft: ResumeDraft; hideSensitive: boolean }) {
  const c = props.draft.contact;
  const mask = props.hideSensitive;

  return (
    <div
      className="p-6 space-y-4 text-sm overflow-y-auto h-full"
      style={{ background: 'var(--p-bg)', color: 'var(--p-text)', fontFamily: 'serif' }}
    >
      {/* Header */}
      <div className="text-center space-y-1 pb-3" style={{ borderBottom: '2px solid var(--p-text)' }}>
        <h2 className="text-lg font-bold uppercase tracking-wide">
          {c.fullName || 'Your Name'}
        </h2>
        <p className="text-xs" style={{ color: 'var(--p-text-muted)' }}>
          {mask ? '***' : (c.email || 'email@example.com')}
          {' | '}
          {mask ? '***' : (c.phone || '(555) 000-0000')}
          {' | '}
          {c.city || 'City'}, {c.state || 'State'}
        </p>
        <p className="text-xs" style={{ color: 'var(--p-text-dim)' }}>
          Citizenship: {c.citizenship || 'Not specified'} | Veteran: {c.veteranStatus || 'N/A'}
        </p>
      </div>

      {/* Summary */}
      {props.draft.summary && (
        <div>
          <h3 className="text-xs font-bold uppercase tracking-wider mb-1" style={{ color: 'var(--p-text)' }}>
            Professional Summary
          </h3>
          <p className="text-xs leading-relaxed" style={{ color: 'var(--p-text-muted)' }}>
            {props.draft.summary}
          </p>
        </div>
      )}

      {/* Experience */}
      {props.draft.experience.length > 0 && (
        <div>
          <h3 className="text-xs font-bold uppercase tracking-wider mb-2" style={{ color: 'var(--p-text)' }}>
            Experience
          </h3>
          {props.draft.experience.map(function (exp) {
            return (
              <div key={exp.id} className="mb-3">
                <p className="font-semibold text-xs">{exp.jobTitle || 'Job Title'}</p>
                <p className="text-xs" style={{ color: 'var(--p-text-muted)' }}>
                  {exp.employer || 'Employer'} | {exp.location || 'Location'}
                  {exp.grade ? ' | ' + exp.grade : ''}
                </p>
                <p className="text-[11px]" style={{ color: 'var(--p-text-dim)' }}>
                  {exp.startDate || 'Start'} - {exp.endDate || 'Present'}
                  {exp.hoursPerWeek ? ' | ' + exp.hoursPerWeek + ' hrs/wk' : ''}
                </p>
                {exp.duties && (
                  <p className="text-xs mt-1 leading-relaxed" style={{ color: 'var(--p-text-muted)' }}>
                    {exp.duties}
                  </p>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Education */}
      {props.draft.education.length > 0 && (
        <div>
          <h3 className="text-xs font-bold uppercase tracking-wider mb-2" style={{ color: 'var(--p-text)' }}>
            Education
          </h3>
          {props.draft.education.map(function (edu) {
            return (
              <div key={edu.id} className="mb-2">
                <p className="font-semibold text-xs">{edu.degree || 'Degree'} in {edu.field || 'Field'}</p>
                <p className="text-xs" style={{ color: 'var(--p-text-muted)' }}>
                  {edu.institution || 'Institution'} | {edu.graduationDate || 'Date'}
                  {edu.gpa ? ' | GPA: ' + edu.gpa : ''}
                </p>
              </div>
            );
          })}
        </div>
      )}

      {/* Skills */}
      {props.draft.skills.length > 0 && (
        <div>
          <h3 className="text-xs font-bold uppercase tracking-wider mb-2" style={{ color: 'var(--p-text)' }}>
            Skills
          </h3>
          <p className="text-xs" style={{ color: 'var(--p-text-muted)' }}>
            {props.draft.skills.map(function (s) { return s.name; }).join(', ')}
          </p>
        </div>
      )}

      {/* Empty state */}
      {!props.draft.summary && props.draft.experience.length === 0 && props.draft.education.length === 0 && (
        <div className="flex flex-col items-center justify-center py-12 gap-3" style={{ color: 'var(--p-text-dim)' }}>
          <FileText className="w-10 h-10 opacity-40" />
          <p className="text-xs text-center">Start editing on the left to see your resume preview here.</p>
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main screen
// ---------------------------------------------------------------------------

export function ResumeBuilderScreen(_props: ResumeBuilderScreenProps) {
  const [store, setStore] = useState<ResumeStore>({
    schemaVersion: 1,
    draft: createDefaultDraft(),
    versions: [],
  });
  const [mounted, setMounted] = useState(false);
  const [hideSensitive, setHideSensitive] = useState(false);
  const [showVersions, setShowVersions] = useState(false);
  const [versionLabel, setVersionLabel] = useState('');

  useEffect(function () {
    const loaded = loadResumeStore();
    queueMicrotask(function () {
      setStore(loaded);
      setMounted(true);
    });
  }, []);

  const persist = useCallback(function (next: ResumeStore) {
    setStore(next);
    saveResumeStore(next);
  }, []);

  const setDraft = useCallback(function (draft: ResumeDraft) {
    persist(updateDraft(store, draft));
  }, [store, persist]);

  // Contact updater
  const setContact = useCallback(function (field: keyof ResumeContact, value: string) {
    setDraft({ ...store.draft, contact: { ...store.draft.contact, [field]: value } });
  }, [store.draft, setDraft]);

  // Experience CRUD
  const addExperience = useCallback(function () {
    const exp: ResumeExperience = {
      id: genId(), jobTitle: '', employer: '', location: '',
      startDate: '', endDate: '', hoursPerWeek: '', grade: '', duties: '',
    };
    setDraft({ ...store.draft, experience: store.draft.experience.concat([exp]) });
  }, [store.draft, setDraft]);

  const updateExperience = useCallback(function (id: string, field: keyof ResumeExperience, value: string) {
    setDraft({
      ...store.draft,
      experience: store.draft.experience.map(function (e) {
        if (e.id !== id) return e;
        return { ...e, [field]: value };
      }),
    });
  }, [store.draft, setDraft]);

  const removeExperience = useCallback(function (id: string) {
    setDraft({
      ...store.draft,
      experience: store.draft.experience.filter(function (e) { return e.id !== id; }),
    });
  }, [store.draft, setDraft]);

  // Education CRUD
  const addEducation = useCallback(function () {
    const edu: ResumeEducation = {
      id: genId(), institution: '', degree: '', field: '', graduationDate: '', gpa: '',
    };
    setDraft({ ...store.draft, education: store.draft.education.concat([edu]) });
  }, [store.draft, setDraft]);

  const updateEducation = useCallback(function (id: string, field: keyof ResumeEducation, value: string) {
    setDraft({
      ...store.draft,
      education: store.draft.education.map(function (e) {
        if (e.id !== id) return e;
        return { ...e, [field]: value };
      }),
    });
  }, [store.draft, setDraft]);

  const removeEducation = useCallback(function (id: string) {
    setDraft({
      ...store.draft,
      education: store.draft.education.filter(function (e) { return e.id !== id; }),
    });
  }, [store.draft, setDraft]);

  // Skills CRUD
  const addSkill = useCallback(function () {
    const skill: ResumeSkill = { id: genId(), name: '' };
    setDraft({ ...store.draft, skills: store.draft.skills.concat([skill]) });
  }, [store.draft, setDraft]);

  const updateSkill = useCallback(function (id: string, name: string) {
    setDraft({
      ...store.draft,
      skills: store.draft.skills.map(function (s) {
        if (s.id !== id) return s;
        return { ...s, name: name };
      }),
    });
  }, [store.draft, setDraft]);

  const removeSkill = useCallback(function (id: string) {
    setDraft({
      ...store.draft,
      skills: store.draft.skills.filter(function (s) { return s.id !== id; }),
    });
  }, [store.draft, setDraft]);

  // Version actions
  const handleSaveVersion = useCallback(function () {
    const label = versionLabel.trim() || ('v' + (store.versions.length + 1));
    persist(createVersion(store, label));
    setVersionLabel('');
  }, [store, versionLabel, persist]);

  const handleRestore = useCallback(function (id: string) {
    persist(restoreVersion(store, id));
  }, [store, persist]);

  const handleDeleteVersion = useCallback(function (id: string) {
    persist(deleteVersion(store, id));
  }, [store, persist]);

  if (!mounted) {
    return (
      <div className="flex items-center justify-center h-64" style={{ color: 'var(--p-text-dim)' }}>
        <p className="text-sm">Loading resume builder...</p>
      </div>
    );
  }

  const versions = listVersions(store);

  return (
    <div className="flex flex-col h-full" style={{ color: 'var(--p-text)' }}>
      {/* Toolbar */}
      <div
        className="px-4 py-2.5 flex items-center justify-between gap-3 flex-wrap"
        style={{ borderBottom: '1px solid var(--p-border)', background: 'var(--p-surface)' }}
      >
        <div className="flex items-center gap-2">
          <FileText className="w-4 h-4" style={{ color: 'var(--p-accent)' }} />
          <h2 className="text-sm font-semibold" style={{ color: 'var(--p-text)' }}>Resume Builder</h2>
          <span className="flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded" style={{
            color: 'var(--p-success)',
            background: 'color-mix(in srgb, var(--p-success) 12%, transparent)',
          }}>
            <ShieldCheck className="w-3 h-3" />
            Local only
          </span>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={function () { setHideSensitive(!hideSensitive); }}
            className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium rounded transition-colors"
            style={{
              border: '1px solid var(--p-border)',
              borderRadius: 'var(--p-radius)',
              color: 'var(--p-text-muted)',
              background: 'transparent',
            }}
            aria-label={hideSensitive ? 'Show sensitive fields' : 'Hide sensitive fields'}
          >
            {hideSensitive ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
            {hideSensitive ? 'Masked' : 'Visible'}
          </button>
          <button
            type="button"
            onClick={function () { setShowVersions(!showVersions); }}
            className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium rounded transition-colors"
            style={{
              border: '1px solid var(--p-border)',
              borderRadius: 'var(--p-radius)',
              color: 'var(--p-text-muted)',
              background: 'transparent',
            }}
          >
            <Clock className="w-3.5 h-3.5" />
            Versions ({versions.length})
          </button>
        </div>
      </div>

      <div
        className="px-4 py-2 text-xs"
        style={{
          borderBottom: '1px solid var(--p-border)',
          background: 'var(--p-surface2)',
          color: 'var(--p-text-muted)',
        }}
      >
        Shared Resume Builder modules are active in this route and continue to expand in shared UI.
      </div>

      {/* Versions panel */}
      {showVersions && (
        <div
          className="px-4 py-3 space-y-2"
          style={{ borderBottom: '1px solid var(--p-border)', background: 'var(--p-surface2)' }}
        >
          <div className="flex items-center gap-2">
            <input
              type="text"
              placeholder="Version label..."
              value={versionLabel}
              onChange={function (e) { setVersionLabel(e.target.value); }}
              className="flex-1 text-xs px-2.5 py-1.5 outline-none"
              style={{
                background: 'var(--p-surface)',
                border: '1px solid var(--p-border)',
                borderRadius: 'var(--p-radius)',
                color: 'var(--p-text)',
              }}
            />
            <button
              type="button"
              onClick={handleSaveVersion}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium"
              style={{
                background: 'var(--p-accent)',
                color: 'var(--p-bg)',
                borderRadius: 'var(--p-radius)',
                border: 'none',
              }}
            >
              <Save className="w-3 h-3" />
              Save Version
            </button>
          </div>
          {versions.length === 0 && (
            <p className="text-xs" style={{ color: 'var(--p-text-dim)' }}>No saved versions yet.</p>
          )}
          {versions.map(function (v) {
            const date = new Date(v.createdAt).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
            return (
              <div key={v.id} className="flex items-center justify-between py-1.5">
                <div>
                  <span className="text-xs font-medium" style={{ color: 'var(--p-text)' }}>{v.label}</span>
                  <span className="text-[11px] ml-2" style={{ color: 'var(--p-text-dim)' }}>{date}</span>
                </div>
                <div className="flex gap-1.5">
                  <button
                    type="button"
                    onClick={function () { handleRestore(v.id); }}
                    className="text-[11px] px-2 py-1 rounded"
                    style={{ color: 'var(--p-accent)', border: '1px solid var(--p-border)', background: 'transparent' }}
                    aria-label={'Restore ' + v.label}
                  >
                    <RotateCcw className="w-3 h-3 inline mr-1" />
                    Restore
                  </button>
                  <button
                    type="button"
                    onClick={function () { handleDeleteVersion(v.id); }}
                    className="text-[11px] px-2 py-1 rounded"
                    style={{ color: 'var(--p-danger, #ef4444)', border: '1px solid var(--p-border)', background: 'transparent' }}
                    aria-label={'Delete ' + v.label}
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Main two-pane layout */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left: editor */}
        <div className="w-1/2 overflow-y-auto p-4" style={{ borderRight: '1px solid var(--p-border)' }}>
          <Section title="Contact Information">
            <div className="grid grid-cols-2 gap-3">
              <Field label="Full Name" value={store.draft.contact.fullName} onChange={function (v) { setContact('fullName', v); }} placeholder="Jordan Rivera" />
              <Field label="Email" value={store.draft.contact.email} onChange={function (v) { setContact('email', v); }} placeholder="jordan@example.com" />
              <Field label="Phone" value={store.draft.contact.phone} onChange={function (v) { setContact('phone', v); }} placeholder="(555) 000-0000" />
              <Field label="City" value={store.draft.contact.city} onChange={function (v) { setContact('city', v); }} placeholder="Washington" />
              <Field label="State" value={store.draft.contact.state} onChange={function (v) { setContact('state', v); }} placeholder="DC" />
              <Field label="Citizenship" value={store.draft.contact.citizenship} onChange={function (v) { setContact('citizenship', v); }} placeholder="United States" />
            </div>
            <Field label="Veteran Status" value={store.draft.contact.veteranStatus} onChange={function (v) { setContact('veteranStatus', v); }} placeholder="N/A, 5-point, 10-point..." />
          </Section>

          <Section title="Professional Summary">
            <Field
              label="Summary"
              type="textarea"
              value={store.draft.summary}
              onChange={function (v) { setDraft({ ...store.draft, summary: v }); }}
              placeholder="Briefly describe your professional background and career goals..."
            />
          </Section>

          <Section title="Experience" defaultOpen={true}>
            {store.draft.experience.map(function (exp, idx) {
              return (
                <div key={exp.id} className="p-3 mb-2" style={{ background: 'var(--p-surface2)', borderRadius: 'var(--p-radius)', border: '1px solid var(--p-border)' }}>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-medium" style={{ color: 'var(--p-text-dim)' }}>Position {idx + 1}</span>
                    <button type="button" onClick={function () { removeExperience(exp.id); }} style={{ color: 'var(--p-danger, #ef4444)' }} aria-label="Remove position">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <Field label="Job Title" value={exp.jobTitle} onChange={function (v) { updateExperience(exp.id, 'jobTitle', v); }} />
                    <Field label="Employer" value={exp.employer} onChange={function (v) { updateExperience(exp.id, 'employer', v); }} />
                    <Field label="Location" value={exp.location} onChange={function (v) { updateExperience(exp.id, 'location', v); }} />
                    <Field label="Grade" value={exp.grade} onChange={function (v) { updateExperience(exp.id, 'grade', v); }} placeholder="GS-12" />
                    <Field label="Start Date" value={exp.startDate} onChange={function (v) { updateExperience(exp.id, 'startDate', v); }} placeholder="MM/YYYY" />
                    <Field label="End Date" value={exp.endDate} onChange={function (v) { updateExperience(exp.id, 'endDate', v); }} placeholder="Present" />
                    <Field label="Hours/Week" value={exp.hoursPerWeek} onChange={function (v) { updateExperience(exp.id, 'hoursPerWeek', v); }} placeholder="40" />
                  </div>
                  <div className="mt-2">
                    <Field label="Duties" type="textarea" value={exp.duties} onChange={function (v) { updateExperience(exp.id, 'duties', v); }} placeholder="Describe key duties and accomplishments..." />
                  </div>
                </div>
              );
            })}
            <button
              type="button"
              onClick={addExperience}
              className="flex items-center gap-1.5 text-xs font-medium px-3 py-2 rounded transition-colors w-full justify-center"
              style={{ border: '1px dashed var(--p-border)', color: 'var(--p-text-muted)', background: 'transparent' }}
            >
              <Plus className="w-3.5 h-3.5" />
              Add Experience
            </button>
          </Section>

          <Section title="Education" defaultOpen={false}>
            {store.draft.education.map(function (edu, idx) {
              return (
                <div key={edu.id} className="p-3 mb-2" style={{ background: 'var(--p-surface2)', borderRadius: 'var(--p-radius)', border: '1px solid var(--p-border)' }}>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-medium" style={{ color: 'var(--p-text-dim)' }}>Education {idx + 1}</span>
                    <button type="button" onClick={function () { removeEducation(edu.id); }} style={{ color: 'var(--p-danger, #ef4444)' }} aria-label="Remove education">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <Field label="Institution" value={edu.institution} onChange={function (v) { updateEducation(edu.id, 'institution', v); }} />
                    <Field label="Degree" value={edu.degree} onChange={function (v) { updateEducation(edu.id, 'degree', v); }} />
                    <Field label="Field of Study" value={edu.field} onChange={function (v) { updateEducation(edu.id, 'field', v); }} />
                    <Field label="Graduation Date" value={edu.graduationDate} onChange={function (v) { updateEducation(edu.id, 'graduationDate', v); }} />
                    <Field label="GPA" value={edu.gpa} onChange={function (v) { updateEducation(edu.id, 'gpa', v); }} placeholder="Optional" />
                  </div>
                </div>
              );
            })}
            <button
              type="button"
              onClick={addEducation}
              className="flex items-center gap-1.5 text-xs font-medium px-3 py-2 rounded transition-colors w-full justify-center"
              style={{ border: '1px dashed var(--p-border)', color: 'var(--p-text-muted)', background: 'transparent' }}
            >
              <Plus className="w-3.5 h-3.5" />
              Add Education
            </button>
          </Section>

          <Section title="Skills" defaultOpen={false}>
            <div className="flex flex-wrap gap-2">
              {store.draft.skills.map(function (skill) {
                return (
                  <div
                    key={skill.id}
                    className="flex items-center gap-1.5 px-2 py-1"
                    style={{ background: 'var(--p-surface2)', borderRadius: 'var(--p-radius)', border: '1px solid var(--p-border)' }}
                  >
                    <input
                      type="text"
                      value={skill.name}
                      onChange={function (e) { updateSkill(skill.id, e.target.value); }}
                      placeholder="Skill name"
                      className="bg-transparent text-xs outline-none w-24"
                      style={{ color: 'var(--p-text)' }}
                    />
                    <button type="button" onClick={function () { removeSkill(skill.id); }} style={{ color: 'var(--p-text-dim)' }} aria-label="Remove skill">
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                );
              })}
            </div>
            <button
              type="button"
              onClick={addSkill}
              className="flex items-center gap-1.5 text-xs font-medium px-3 py-2 rounded transition-colors w-full justify-center mt-2"
              style={{ border: '1px dashed var(--p-border)', color: 'var(--p-text-muted)', background: 'transparent' }}
            >
              <Plus className="w-3.5 h-3.5" />
              Add Skill
            </button>
          </Section>
        </div>

        {/* Right: live preview */}
        <div className="w-1/2 overflow-hidden flex flex-col">
          <div className="px-4 py-2 flex items-center gap-2" style={{ borderBottom: '1px solid var(--p-border)', background: 'var(--p-surface2)' }}>
            <Eye className="w-3.5 h-3.5" style={{ color: 'var(--p-text-dim)' }} />
            <span className="text-xs font-medium" style={{ color: 'var(--p-text-dim)' }}>Live Preview</span>
          </div>
          <ResumePreview draft={store.draft} hideSensitive={hideSensitive} />
        </div>
      </div>
    </div>
  );
}
