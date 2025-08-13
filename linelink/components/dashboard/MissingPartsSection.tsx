import { useEffect, useState } from "react";
import { Button } from "../ui/button";
import { Package, Truck, Loader2, AlertCircle } from "lucide-react";
import LiveStatusBar from "./LiveStatusBar";
import { useApi } from "@/contexts/AuthContext";
import toast from "react-hot-toast";

const statusColors: Record<string, string> = {
  requested: "bg-yellow-100 text-yellow-800",
  dispatched: "bg-blue-100 text-blue-800",
  default: "bg-gray-100 text-gray-800",
};

interface MissingPart {
  work_order: string;
  part_number: string;
  description: string;
  quantity_required: number;
  quantity_supplied: number;
  status: string;
  unit_number: string;
  station_number: string;
}

export default function MissingPartsSection() {
  const api = useApi();
  const [parts, setParts] = useState<MissingPart[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState(
    new Date().toLocaleTimeString()
  );
  const [dispatching, setDispatching] = useState<Record<string, boolean>>({});
  const [debugInfo, setDebugInfo] = useState<any>(null); // For debugging

  const fetchMissingParts = async () => {
    try {
      setLoading(true);
      setError(null);
      
      console.log("Fetching missing parts...");
      const response = await api.get("/parts/needed_parts");
      
      console.log("Full API response:", response);
      console.log("Response data:", response.data);
      console.log("Response type:", typeof response);
      console.log("Response data type:", typeof response.data);
      
      // Store debug info for display
      setDebugInfo({
        responseType: typeof response,
        dataType: typeof response.data,
        isDataArray: Array.isArray(response.data),
        dataKeys: response.data ? Object.keys(response.data) : null,
        rawResponse: JSON.stringify(response, null, 2)
      });

      let partsArray = [];
      
      // More comprehensive data extraction
      if (Array.isArray(response)) {
        partsArray = response;
        console.log("Response is directly an array");
      } else if (Array.isArray(response.data)) {
        partsArray = response.data;
        console.log("Response.data is an array");
      } else if (response.data && Array.isArray(response.data.data)) {
        partsArray = response.data.data;
        console.log("Response.data.data is an array");
      } else if (response.data && Array.isArray(response.data.results)) {
        partsArray = response.data.results;
        console.log("Response.data.results is an array");
      } else if (response.data && Array.isArray(response.data.parts)) {
        partsArray = response.data.parts;
        console.log("Response.data.parts is an array");
      } else if (response.data && Array.isArray(response.data.needed_parts)) {
        partsArray = response.data.needed_parts;
        console.log("Response.data.needed_parts is an array");
      } else {
        console.log("Could not find array in response structure");
        console.log("Available keys:", response.data ? Object.keys(response.data) : 'No data object');
        
        // If response.data is an object but not an array, try to extract any array values
        if (response.data && typeof response.data === 'object') {
          const arrayValues = Object.values(response.data).filter(Array.isArray);
          if (arrayValues.length > 0) {
            partsArray = arrayValues[0] as any[];
            console.log("Found array in object values:", arrayValues[0]);
          }
        }
      }

      console.log("Extracted parts array:", partsArray);
      console.log("Parts array length:", partsArray.length);

      if (!Array.isArray(partsArray)) {
        throw new Error(`Expected array but got ${typeof partsArray}. Check API response format.`);
      }

      // Enhanced part processing with better error handling
      const partsWithStatus = partsArray.map((part: any, index: number) => {
        console.log(`Processing part ${index}:`, part);
        
        const base: MissingPart = {
          work_order: part.work_order || part.workOrder || part.work_order_id || `WO-${index}`,
          part_number: part.part_number || part.partNumber || part.part_id || `PART-${index}`,
          description: part.description || part.part_description || part.name || 'Unknown Part',
          quantity_required: Number(part.quantity_required || part.quantityRequired || part.qty_required || part.required || 0),
          quantity_supplied: Number(part.quantity_supplied || part.quantitySupplied || part.qty_supplied || part.supplied || 0),
          unit_number: part.unit_number || part.unitNumber || part.unit || '',
          station_number: part.station_number || part.stationNumber || part.station || '',
          status: 'requested' // Default status
        };
        
        // Determine status based on quantities
        if (base.quantity_supplied >= base.quantity_required && base.quantity_required > 0) {
          base.status = 'dispatched';
        } else {
          base.status = 'requested';
        }
        
        console.log(`Processed part ${index}:`, base);
        return base;
      });

      console.log("Final processed parts:", partsWithStatus);
      setParts(partsWithStatus);
      setLastUpdated(new Date().toLocaleTimeString());
      
      if (partsWithStatus.length === 0) {
        console.log("No parts found - this might be normal if there are no missing parts");
      }
      
    } catch (err: any) {
      console.error("Failed to load missing parts:", err);
      console.error("Error details:", {
        message: err.message,
        response: err.response,
        status: err.response?.status,
        data: err.response?.data
      });
      
      const errorMessage = err.response?.data?.error || err.message || "Failed to load missing parts";
      setError(errorMessage);
      toast.error(errorMessage);
      setParts([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let isMounted = true;
    
    const fetchData = async () => {
      if (isMounted) {
        await fetchMissingParts();
      }
    };
  
    fetchData();
    const interval = setInterval(fetchData, 30000);
  
    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, [api]);

  const handleDispatch = async (part: MissingPart) => {
    const partKey = `${part.work_order}-${part.part_number}`;

    try {
      setDispatching((prev) => ({ ...prev, [partKey]: true }));

      const quantityToDispatch = part.quantity_required - part.quantity_supplied;

      // Ensure work_order_id is in the correct format for the backend
      let workOrderId = part.work_order;
      
      // If the work order doesn't start with "WO", add the prefix
      if (!workOrderId.startsWith('WO')) {
        // Check if it's a numeric ID and add WO prefix
        if (/^\d+$/.test(workOrderId)) {
          workOrderId = `WO${workOrderId}`;
        } else {
          // If it doesn't match expected format, ensure it has WO prefix
          workOrderId = workOrderId.startsWith('WO') ? workOrderId : `WO${workOrderId}`;
        }
      }

      console.log('Dispatching part:', {
        original_work_order: part.work_order,
        formatted_work_order_id: workOrderId,
        part_number: part.part_number,
        quantity_supplied: quantityToDispatch,
        station_number: part.station_number
      });

      const dispatchPayload = {
        part_number: part.part_number,
        quantity_supplied: quantityToDispatch,
        station_number: part.station_number || "1",
        work_order_id: workOrderId,
      };

      console.log('Dispatch payload:', dispatchPayload);

      await api.post("/warehouse/dispatch", dispatchPayload);

      // Optimistic update
      setParts((prev) =>
        prev.map((p) =>
          p.work_order === part.work_order && p.part_number === part.part_number
            ? {
                ...p,
                quantity_supplied: p.quantity_required,
                status: "dispatched",
              }
            : p
        )
      );

      toast.success(`Dispatched ${quantityToDispatch} ${part.description}`);
      
      // Refresh the parts list after successful dispatch
      setTimeout(() => {
        fetchMissingParts();
      }, 1000);

    } catch (err: any) {
      console.error("Dispatch failed:", err);
      console.error("Error response:", err.response?.data);
      
      const errorMessage = err.response?.data?.error || err.message || "Dispatch failed";
      toast.error(`Dispatch failed: ${errorMessage}`);
    } finally {
      setDispatching((prev) => ({ ...prev, [partKey]: false }));
    }
  };

  return (
    <div className="w-full">
      <LiveStatusBar lastUpdated={lastUpdated} className="mb-4" />
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="p-4 sm:p-6">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4 sm:mb-6">
            <h2 className="text-xl sm:text-2xl font-bold flex items-center mb-2 sm:mb-0">
              <Package className="w-5 h-5 sm:w-6 sm:h-6 mr-2 sm:mr-3" />
              Missing Parts
              {parts.length > 0 && (
                <span className="ml-2 bg-red-100 text-red-800 text-xs px-2 py-1 rounded-full">
                  {parts.filter(p => p.status === 'requested').length}
                </span>
              )}
            </h2>
            <div className="text-xs sm:text-sm text-gray-500">
              Updated: {lastUpdated}
            </div>
          </div>

          {/* Debug Information - Remove in production */}
          {process.env.NODE_ENV === 'development' && debugInfo && (
            <div className="mb-4 p-3 bg-gray-100 rounded-lg text-xs">
              <details>
                <summary className="cursor-pointer font-medium">Debug Info (Click to expand)</summary>
                <pre className="mt-2 text-xs overflow-auto max-h-40">
                  {JSON.stringify(debugInfo, null, 2)}
                </pre>
              </details>
            </div>
          )}

          <div className="overflow-x-auto -mx-2 sm:mx-0">
            <div className="min-w-full">
              {loading ? (
                <div className="flex justify-center items-center py-8">
                  <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
                  <span className="ml-2 text-gray-600">Loading missing parts...</span>
                </div>
              ) : error ? (
                <div className="text-center py-8">
                  <AlertCircle className="mx-auto h-10 w-10 text-red-400 mb-2" />
                  <p className="text-red-600 font-medium mb-2">Error Loading Parts</p>
                  <p className="text-sm text-gray-600 mb-4">{error}</p>
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={fetchMissingParts}
                    disabled={loading}
                  >
                    {loading ? (
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    ) : null}
                    Retry
                  </Button>
                </div>
              ) : parts.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <Package className="mx-auto h-10 w-10 text-gray-300 mb-2" />
                  <p className="text-sm sm:text-base font-medium mb-1">
                    No missing parts at the moment
                  </p>
                  <p className="text-xs text-gray-400">
                    All required parts are available
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {parts.map((part, index) => (
                    <div
                      key={`${part.work_order}-${part.part_number}-${index}`}
                      className="border rounded-lg p-3 sm:p-4 hover:shadow-sm transition-shadow"
                    >
                      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-2">
                        <div className="flex-1">
                          <div className="flex justify-between items-start gap-2">
                            <h3 className="text-sm sm:text-base font-medium text-gray-900 line-clamp-2">
                              {part.description}
                            </h3>
                            <span
                              className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium whitespace-nowrap ${
                                statusColors[part.status] ||
                                statusColors.default
                              }`}
                            >
                              {part.status}
                            </span>
                          </div>

                          <div className="mt-1 text-xs sm:text-sm text-gray-600">
                            <p>
                              Part #: {part.part_number} • WO: {part.work_order}
                            </p>
                          </div>

                          <div className="mt-2 grid grid-cols-2 sm:flex sm:gap-4 text-xs sm:text-sm">
                            <div className="flex items-center">
                              <span className="text-gray-500 mr-1">
                                Needed:
                              </span>
                              <span className="font-medium">
                                {part.quantity_required}
                              </span>
                            </div>
                            <div className="flex items-center">
                              <span className="text-gray-500 mr-1">
                                Supplied:
                              </span>
                              <span className="font-medium">
                                {part.quantity_supplied}
                              </span>
                            </div>
                            {part.unit_number && (
                              <div className="flex items-center">
                                <span className="text-gray-500 mr-1">Unit:</span>
                                <span className="font-medium">
                                  {part.unit_number}
                                </span>
                              </div>
                            )}
                            {part.station_number && (
                              <div className="flex items-center">
                                <span className="text-gray-500 mr-1">
                                  Station:
                                </span>
                                <span className="font-medium">
                                  {part.station_number}
                                </span>
                              </div>
                            )}
                          </div>
                        </div>

                        {part.status === "requested" && (
                          <div className="mt-2 sm:mt-0 sm:pl-4 border-t sm:border-t-0 sm:border-l border-gray-100 pt-3 sm:pt-0 sm:ml-4">
                            <Button
                              size="sm"
                              variant="outline"
                              className="w-full sm:w-auto"
                              onClick={() => handleDispatch(part)}
                              disabled={
                                dispatching[
                                  `${part.work_order}-${part.part_number}`
                                ]
                              }
                            >
                              {dispatching[
                                `${part.work_order}-${part.part_number}`
                              ] ? (
                                <Loader2 className="mr-2 h-3 w-3 sm:h-4 sm:w-4 animate-spin" />
                              ) : (
                                <Truck className="mr-2 h-3 w-3 sm:h-4 sm:w-4" />
                              )}
                              Dispatch
                            </Button>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}