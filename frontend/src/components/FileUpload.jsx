export function FileUpload({ onFile }) {
  const handleChange = (e) => {
    const file = e.target.files?.[0];
    if (file && onFile) onFile(file);
  };
  return (
    <label className="flex flex-col items-center justify-center border-2 border-dashed border-slate-200 rounded-lg p-4 cursor-pointer hover:border-brand-300">
      <span className="text-sm text-slate-600">Upload proof</span>
      <input type="file" className="hidden" onChange={handleChange} />
    </label>
  );
}
