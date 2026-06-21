import { useRef, useState } from 'react';

type ProjectStatus = {
  type: 'success' | 'error';
  message: string;
} | null;

type ProjectControlsProps = {
  hasSeed: boolean;
  status: ProjectStatus;
  onDownloadProject: () => void;
  onOpenProjectFile: (file: File) => Promise<void>;
};

export function ProjectControls({
  hasSeed,
  status,
  onDownloadProject,
  onOpenProjectFile
}: ProjectControlsProps) {
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
    <section className="panel project-controls-panel" aria-label="Project">
      <div className="panel-header slim">
        <h2>Project</h2>
      </div>

      <div
        className={`project-drop-zone${isDragOver ? ' is-drag-over' : ''}`}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        <p className="hint">Drop a .melody-seed.json project file here</p>
      </div>

      <div className="project-controls-actions">
        <button type="button" onClick={handleOpenClick}>
          Open Project
        </button>
        <button type="button" disabled={!hasSeed} onClick={onDownloadProject}>
          Download Project
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
