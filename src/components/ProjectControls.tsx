import { useRef, useState } from 'react';

type ProjectStatus = {
  type: 'success' | 'error';
  message: string;
} | null;

type ProjectControlsProps = {
  status: ProjectStatus;
  onOpenProjectFile: (file: File) => Promise<void>;
};

function OpenProjectIcon() {
  return (
    <svg className="project-open-button__icon" viewBox="0 0 16 16" aria-hidden="true">
      <path
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M8 10V2.5M8 2.5 5.5 5M8 2.5l2.5 2.5"
      />
      <path
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M2.5 10v2.5a1 1 0 0 0 1 1h9a1 1 0 0 0 1-1V10"
      />
    </svg>
  );
}

export function ProjectControls({ status, onOpenProjectFile }: ProjectControlsProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragOver, setIsDragOver] = useState(false);

  const handleOpenClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';

    if (!file) {
      return;
    }

    await onOpenProjectFile(file);
  };

  const handleDragOver = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.stopPropagation();
    setIsDragOver(true);
  };

  const handleDragLeave = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.stopPropagation();
    setIsDragOver(false);
  };

  const handleDrop = async (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.stopPropagation();
    setIsDragOver(false);

    const file = event.dataTransfer.files[0];
    if (!file) {
      return;
    }

    await onOpenProjectFile(file);
  };

  return (
    <section className="project-restore" aria-label="Open project">
      <div
        className={`project-drop-zone${isDragOver ? ' is-drag-over' : ''}`}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        <p className="hint">Drop a .melody-seed.json project file here</p>
        <button
          type="button"
          className="project-open-button"
          onClick={handleOpenClick}
          aria-label="Open Project"
          title="Open Project"
        >
          <OpenProjectIcon />
        </button>
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept=".melody-seed.json,.json,application/json"
        hidden
        onChange={handleFileChange}
      />

      {status ? (
        <p
          className={`project-status project-status--${status.type}`}
          aria-live="polite"
          role="status"
        >
          {status.message}
        </p>
      ) : null}
    </section>
  );
}
