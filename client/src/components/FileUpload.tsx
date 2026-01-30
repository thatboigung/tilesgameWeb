import { useCallback, useState } from "react";
import { useDropzone } from "react-dropzone";
import { Upload, Music, Loader2, AlertCircle } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface FileUploadProps {
  onFileSelected: (file: File) => void;
  isAnalyzing: boolean;
}

export function FileUpload({ onFileSelected, isAnalyzing }: FileUploadProps) {
  const [error, setError] = useState<string | null>(null);

  const onDrop = useCallback((acceptedFiles: File[]) => {
    setError(null);
    if (acceptedFiles.length > 0) {
      const file = acceptedFiles[0];
      if (file.type.startsWith('audio/')) {
        onFileSelected(file);
      } else {
        setError("Please upload a valid audio file (MP3, WAV)");
      }
    }
  }, [onFileSelected]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { 'audio/*': [] },
    multiple: false,
    disabled: isAnalyzing
  });

  return (
    <div className="w-full max-w-xl mx-auto mb-8">
      <motion.div
        {...getRootProps()}
        whileHover={!isAnalyzing ? { scale: 1.01, borderColor: "rgba(0, 255, 200, 0.5)" } : {}}
        whileTap={!isAnalyzing ? { scale: 0.99 } : {}}
        className={`
          relative overflow-hidden rounded-2xl border-2 border-dashed p-10 text-center cursor-pointer
          transition-colors duration-300 flex flex-col items-center justify-center min-h-[240px]
          ${isDragActive ? 'border-primary bg-primary/5' : 'border-border bg-card/50 hover:bg-card/80'}
          ${isAnalyzing ? 'opacity-80 cursor-not-allowed border-primary/30' : ''}
          ${error ? 'border-destructive/50 bg-destructive/5' : ''}
        `}
      >
        <input {...getInputProps()} />
        
        <AnimatePresence mode="wait">
          {isAnalyzing ? (
            <motion.div
              key="analyzing"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex flex-col items-center gap-4"
            >
              <div className="relative">
                <div className="absolute inset-0 rounded-full bg-primary/20 animate-ping" />
                <Loader2 className="w-16 h-16 text-primary animate-spin relative z-10" />
              </div>
              <h3 className="text-xl font-bold text-primary animate-pulse">Analyzing Audio...</h3>
              <p className="text-sm text-muted-foreground">Decoding waveform & extracting tempo</p>
            </motion.div>
          ) : (
            <motion.div
              key="upload"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex flex-col items-center gap-4"
            >
              <div className={`
                w-20 h-20 rounded-full flex items-center justify-center mb-2
                ${isDragActive ? 'bg-primary text-background' : 'bg-secondary/10 text-secondary'}
                transition-colors duration-300
              `}>
                {isDragActive ? <Upload className="w-10 h-10" /> : <Music className="w-10 h-10" />}
              </div>
              
              <div>
                <h3 className="text-lg font-bold text-foreground mb-1">
                  {isDragActive ? "Drop the beat!" : "Upload Audio File"}
                </h3>
                <p className="text-sm text-muted-foreground max-w-xs mx-auto leading-relaxed">
                  Drag and drop your MP3/WAV file here, or click to browse your library.
                </p>
              </div>

              {error && (
                <div className="flex items-center gap-2 text-destructive text-sm mt-2 bg-destructive/10 px-3 py-1.5 rounded-full">
                  <AlertCircle className="w-4 h-4" />
                  {error}
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Decorative corner accents */}
        <div className="absolute top-0 left-0 w-4 h-4 border-t-2 border-l-2 border-primary/30 rounded-tl-lg m-2" />
        <div className="absolute top-0 right-0 w-4 h-4 border-t-2 border-r-2 border-primary/30 rounded-tr-lg m-2" />
        <div className="absolute bottom-0 left-0 w-4 h-4 border-b-2 border-l-2 border-primary/30 rounded-bl-lg m-2" />
        <div className="absolute bottom-0 right-0 w-4 h-4 border-b-2 border-r-2 border-primary/30 rounded-br-lg m-2" />
      </motion.div>
    </div>
  );
}
