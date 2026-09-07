import { ArrowRight } from 'lucide-react';
import { useState } from 'react';
import { Link } from 'react-router-dom';

import { readLabProgress, resumeHref } from '../../../shared/labProgress';
import { imageSrc } from '../../../utils/assetPath';
import WorkbenchResources from '../../components/WorkbenchResources';
import { LAB_EXERCISES } from '../../labs/labCatalog';
import { statusForExercise } from '../../labs/evidence';
import { useLabEvidence } from '../../labs/useLabEvidence';
import { EvidenceLoadNotice, LabStatusMark } from './LabShared';
import './Labs.css';

export default function LabsCatalog() {
  const { data, error, loading, reload } = useLabEvidence();
  const [resumePoint] = useState(readLabProgress);
  const resumeLab = LAB_EXERCISES.find((exercise) => exercise.id === resumePoint?.lab);

  return (
    <div className="labs-catalog" data-testid="labs-catalog">
      <header className="labs-catalog-hero">
        <div className="labs-catalog-hero-copy">
          <h1 className="font-display">Governed Lab Collection</h1>
          <p>
            Four labs, one live workbench: build the boundary, measure its
            behavior, prove the exact evidence, and explain the tradeoff.
          </p>
          <Link to={resumePoint ? resumeHref(resumePoint) : '/observatory/workbench?lab=grounded-inventory'}>
            {resumeLab ? `Resume Lab ${Number(resumeLab.number)}` : 'Start Lab 1'}
            <ArrowRight size={16} strokeWidth={1.8} aria-hidden="true" />
          </Link>
        </div>
      </header>

      <section className="labs-catalog-body" aria-labelledby="labs-catalog-heading">
        <div className="labs-catalog-intro">
          <div>
            <h2 id="labs-catalog-heading" className="font-display">Four evidence-first labs</h2>
            <p>Follow Labs 1–4 in order, or return to your current lab. Environment status describes the setup and evidence, not participant completion.</p>
          </div>
        </div>
        {error ? <EvidenceLoadNotice error={error} onRetry={reload} /> : null}
        <div className="labs-catalog-contact-sheet">
          {LAB_EXERCISES.map((exercise, index) => {
            const to = `/observatory/workbench?lab=${exercise.id}`;
            return (
              <article className="labs-catalog-card" data-lab={exercise.number} key={exercise.id} aria-labelledby={`collection-${exercise.id}`}>
                <Link to={to} tabIndex={-1} aria-hidden="true" className="labs-catalog-portrait-link">
                  <figure>
                    <img src={imageSrc(exercise.image)} width={exercise.imageWidth} height={exercise.imageHeight} alt="" loading={index < 2 ? 'eager' : 'lazy'} decoding="async" />
                    <figcaption><span>{exercise.anchorName} · Lab {Number(exercise.number)}</span></figcaption>
                  </figure>
                </Link>
                <div className="labs-catalog-card-copy">
                  <h3 id={`collection-${exercise.id}`}><Link to={to}>{exercise.title}</Link></h3>
                  <p>{exercise.summary}</p>
                  <LabStatusMark status={statusForExercise(exercise, data)} loading={loading} discloseDetails />
                  <Link className="labs-catalog-card-open" to={to} aria-label={`Open Lab ${Number(exercise.number)} in workbench`}>
                    Open Lab {Number(exercise.number)} <ArrowRight size={16} strokeWidth={1.8} aria-hidden="true" />
                  </Link>
                </div>
              </article>
            );
          })}
        </div>
      </section>
      <WorkbenchResources collapsible defaultExpanded={false} />
    </div>
  );
}
