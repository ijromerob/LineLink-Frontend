import { AlertCircle } from "lucide-react";
import { motion } from "framer-motion";

export function ErrorAlert({ error }: { error: string }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      className="mb-4 rounded-md border border-red-200 bg-red-50 p-4"
    >
      <div className="flex items-center gap-2 text-red-800">
        <AlertCircle className="h-4 w-4 flex-shrink-0" />
        <p className="text-sm">{error}</p>
      </div>
    </motion.div>
  );
}