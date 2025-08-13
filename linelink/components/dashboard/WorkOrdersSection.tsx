import { useState, useRef, useEffect } from "react";
import type React from "react";
import { MessageCircle, Package, X, Plus, Loader2 } from "lucide-react";
import { Button } from "../ui/button";
import LiveStatusBar from "./LiveStatusBar";
import { useApi } from "@/contexts/AuthContext";
import { useAuth } from "@/contexts/AuthContext";
import toast from "react-hot-toast";
import { fetchMissingParts } from "@/store/missingPartsThunks";

// Custom hook for API calls with retry logic
const useApiWithRetry = () => {
  const api = useApi();
  const MAX_RETRIES = 3;
  const RETRY_DELAY = 1000; // 1 second

  const callWithRetry = async <T,>(
    method: keyof typeof api,
    endpoint: string,
    data?: any,
    retries = MAX_RETRIES
  ): Promise<{ data?: T; error?: string }> => {
    try {
      // @ts-ignore - Dynamic method access
      const response = await api[method](endpoint, data);
      return { data: response };
    } catch (error: any) {
      console.error(`API Error (${endpoint}):`, error);

      if (retries > 0 && error?.response?.status >= 500) {
        // Only retry on server errors (5xx)
        await new Promise((resolve) => setTimeout(resolve, RETRY_DELAY));
        return callWithRetry(method, endpoint, data, retries - 1);
      }

      return {
        error:
          error.response?.data?.error ||
          error.message ||
          "An unknown error occurred",
      };
    }
  };

  return { callWithRetry };
};


interface PartRequest {
    part_number: string;
    quantity_requested: string;
    unit_number: string;
    station_number: string;
    description?: string;
  }

// Backend work order type (exact match with API response)
type BackendWorkOrder = {
  work_order_id: string; // "WO0000001"
  product_number: string;
  quantity_to_produce: number;
  total_parts_needed: number;
  parts_supplied: number;
  parts_missing: number;
  is_completed: boolean;
};

type WorkOrder = BackendWorkOrder & {
  status: "Pending" | "In Progress" | "Completed";
  progress: number;
  description: string;
  details?: BackendWorkOrderDetail; // Add detailed view
  partsRequested?: PartRequest[]; // Define a proper type if needed
};

type BackendWorkOrderDetail = {
  units: {
    unit_number: string;
    stations: {
      station_number: string;
      unit_status: string;
      station_status: string;
      station_comments: string;
      part_number: string;
      part_description: string;
      quantity_required: number;
      quantity_supplied: number;
    }[];
  }[];
  is_completed: boolean;
};

const statusColumns = [
  { key: "Pending", label: "Pending" },
  { key: "In Progress", label: "In Progress" },
  { key: "Completed", label: "Completed" },
];

const statusColors: Record<string, string> = {
  "In Progress": "bg-yellow-100 text-yellow-800",
  Pending: "bg-gray-100 text-gray-800",
  Completed: "bg-green-100 text-green-800",
};

// Validate work order ID format (WO followed by 7 digits)
const isValidWorkOrderId = (id: string): boolean => {
  return /^WO\d{7}$/.test(id);
};

function getNowString() {
  return new Date().toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

interface WorkOrdersSectionProps {
  onWorkOrderSelect?: (workOrder: WorkOrder | null) => void;
}

export default function WorkOrdersSection({
  onWorkOrderSelect,
}: WorkOrdersSectionProps) {
  const api = useApi();
  const { user } = useAuth();
  const [workOrders, setWorkOrders] = useState<WorkOrder[]>([]);
  const [selectedWO, setSelectedWO] = useState<WorkOrder | null>(null);
  const [partNumber, setPartNumber] = useState("");
  const [partQty, setPartQty] = useState("");
  const [highlighted, setHighlighted] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState(getNowString());
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>("");
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [createProductNumber, setCreateProductNumber] = useState("");
  const [createQuantity, setCreateQuantity] = useState("");
  const [creating, setCreating] = useState(false);
  const [partRequest, setPartRequest] = useState({
    part_number: "",
    quantity_requested: "",
    station_number: "1",
    unit_number: selectedWO?.details?.units[0]?.unit_number || "1",
    description: ""
  });
  const [showPartRequestModal, setShowPartRequestModal] = useState(false);
  const [currentWorkOrderId, setCurrentWorkOrderId] = useState<string | null>(
    null
  );
  const [partRequestLoading, setPartRequestLoading] = useState(false);
  const highlightTimeout = useRef<NodeJS.Timeout | null>(null);

  const transformWorkOrders = (
    backendOrders: BackendWorkOrder[]
  ): WorkOrder[] => {
    return backendOrders.map((wo) => ({
      ...wo,
      status: wo.is_completed
        ? "Completed"
        : wo.parts_supplied > 0
        ? "In Progress"
        : "Pending",
      progress: wo.is_completed
        ? 100
        : wo.total_parts_needed > 0
        ? Math.round((wo.parts_supplied / wo.total_parts_needed) * 100)
        : 0,
      description: `Produce ${wo.quantity_to_produce} units`,
      comments: [],
      partsRequested: [],
    }));
  };

  const fetchWorkOrderDetails = async (workOrderId: string) => {
    try {
      const response = await api.get(`/workorders/${workOrderId}`);
      if (response?.units) {
        setSelectedWO((prev) => {
            if (!prev) return null; // Handle null case
            return {
              ...prev,
              details: response,
              // Make sure all required fields from WorkOrder are included
              status: prev.status || "Pending", // Provide a default status
              progress: prev.progress || 0, // Provide a default progress
              description: prev.description || "", // Provide a default description
            };
          });
      }
    } catch (error) {
      toast.error("Failed to fetch work order details");
    }
  };

  // Call this when a work order is selected
  useEffect(() => {
    if (selectedWO) {
      fetchWorkOrderDetails(selectedWO.work_order_id);
    }
  }, [selectedWO]);

  const fetchWorkOrders = async () => {
    setLoading(true);
    try {
      const response = await api.get("/workorders/");
      if (response?.work_orders) {
        setWorkOrders(transformWorkOrders(response.work_orders));
        setLastUpdated(new Date().toLocaleTimeString());
      }
    } catch (error) {
      console.error("Fetch error:", error);
      toast.error("Failed to fetch work orders");
    } finally {
      setLoading(false);
    }
  };

  const markWorkOrderComplete = async (workOrderId: string) => {
    try {
      const response = await api.post("/workorders/complete", {
        work_order_id: workOrderId,
      });

      if (response.message === "Work order marked as complete") {
        toast.success("Work order completed!");
        await fetchWorkOrders();
      } else {
        toast.error("Cannot complete - not all stations are finished");
      }
    } catch (error) {
      toast.error("Failed to complete work order");
      console.error("Completion error:", error);
    }
  };

  const handleStartWork = (workOrderId: string) => {
    console.log('handleStartWork called for:', workOrderId); // Debug log
    
    const workOrder = workOrders.find((wo) => wo.work_order_id === workOrderId);
    console.log('Found work order:', workOrder); // Debug log
    
    if (workOrder?.details?.units?.length) {
      // Set default unit and station from the first available
      const defaultUnit = workOrder.details.units[0].unit_number;
      const defaultStation = workOrder.details.units[0].stations[0]?.station_number || "1";
      
      console.log('Setting defaults - Unit:', defaultUnit, 'Station:', defaultStation); // Debug log
      
      setPartRequest(prev => ({
        ...prev,
        part_number: "",
        quantity_requested: "",
        unit_number: defaultUnit,
        station_number: defaultStation,
      }));
      
      console.log('Setting currentWorkOrderId and showing modal'); // Debug log
      setCurrentWorkOrderId(workOrderId);
      setShowPartRequestModal(true);
    } else {
      console.log('No units found in work order details'); // Debug log
      toast.error('Work order details not loaded yet');
    }
};

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const response = await api.get("/workorders/");
        if (response?.work_orders) {
          setWorkOrders(transformWorkOrders(response.work_orders));
          setLastUpdated(new Date().toLocaleTimeString());
        }
      } catch (error) {
        toast.error("Failed to fetch work orders");
      } finally {
        setLoading(false);
      }
    };

    fetchData();
    const interval = setInterval(fetchData, 30000);
    return () => clearInterval(interval);
  }, [api]);

  const { callWithRetry } = useApiWithRetry();

  async function createWorkOrder(productNumber: string, quantity: number) {
    setCreating(true);
    setError("");

    try {
      const response = await api.post("/workorders/create_workorder", {
        product_number: productNumber.trim(),
        quantity: quantity,
      });

      if (response?.work_order_id) {
        toast.success(`Work order ${response.work_order_id} created!`);
        await fetchWorkOrders();
        return response.work_order_id;
      }
      throw new Error("Invalid response from server");
    } catch (error: any) {
      const message =
        error.response?.data?.error ||
        error.message ||
        "Failed to create work order";
      setError(message);
      toast.error(message);
      throw error;
    } finally {
      setCreating(false);
    }
  }

  function handleCardClick(wo: WorkOrder) {
    setSelectedWO(wo);
    onWorkOrderSelect?.(wo);
    setPartNumber("");
    setPartQty("");

    // Highlight the selected card temporarily
    setHighlighted(wo.work_order_id);
    if (highlightTimeout.current) {
      clearTimeout(highlightTimeout.current);
    }
    highlightTimeout.current = setTimeout(() => setHighlighted(null), 2000);
  }

  function handleCloseModal() {
    setSelectedWO(null);
    onWorkOrderSelect?.(null);
  }

  const fetchWorkOrdersAndUpdate = async () => {
    try {
      setLoading(true);
      const { data, error } = await callWithRetry<{
        work_orders: BackendWorkOrder[];
      }>("get", "/workorders/");

      if (error) {
        throw new Error(error);
      }

      if (!data) {
        throw new Error("No data received from server");
      }

      // Transform the data to match our WorkOrder type
      const transformedData: WorkOrder[] = data.work_orders.map((wo) => {
        if (!isValidWorkOrderId(wo.work_order_id)) {
          console.warn(`Invalid work order ID format: ${wo.work_order_id}`);
        }

        // Extract numeric ID for internal use, keep full ID for display
        const numericId = wo.work_order_id.replace("WO", "");
        return {
          id: numericId, // Use numeric ID for API calls
          work_order_id: wo.work_order_id, // Keep full ID for display
          product_number: wo.product_number,
          quantity_to_produce: wo.quantity_to_produce,
          total_parts_needed: wo.total_parts_needed,
          parts_supplied: wo.parts_supplied,
          parts_missing: wo.parts_missing,
          is_completed: wo.is_completed,
          // Use the status from backend if available, otherwise determine based on other fields
          status: wo.is_completed
            ? "Completed"
            : wo.parts_supplied > 0
            ? "In Progress"
            : "Pending",
          progress:
            wo.total_parts_needed > 0
              ? Math.round((wo.parts_supplied / wo.total_parts_needed) * 100)
              : 0,
          description: `Order #${wo.work_order_id} - ${wo.quantity_to_produce} units`,
          partsRequested: [],
        };
      });

      setWorkOrders(transformedData);
      setLastUpdated(getNowString());
    } catch (error: any) {
      console.error("Error fetching work orders:", error);
      toast.error(
        `Failed to fetch work orders: ${error.message || "Unknown error"}`
      );
    } finally {
      setLoading(false);
    }
  };

  const handleRequestPart = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!partNumber.trim() || !partQty.trim() || !selectedWO || !user) return;
    setPartRequestLoading(true);
    const part_number = partNumber.trim();
    const quantity_requested = Number(partQty);
    const requested_by = user.user_id;
    const station_number = "1";
    const work_order_id = selectedWO.work_order_id;
    api
      .post("/parts/part_request", {
        part_number,
        quantity_requested,
        requested_by,
        station_number,
        work_order_id,
      })
      .then(() => {
        toast.success("Part request submitted!");
        setPartNumber("");
        setPartQty("");
        if (highlightTimeout.current) clearTimeout(highlightTimeout.current);
        highlightTimeout.current = setTimeout(() => setHighlighted(null), 1200);
        fetchWorkOrdersAndUpdate(); // Refresh work orders so MissingPartsSection updates
      })
      .catch(() => {
        toast.error("Failed to request part");
      })
      .finally(() => {
        setPartRequestLoading(false);
      });
  };

  const handlePartRequestSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentWorkOrderId || !user) return;
  
    // Basic validation
    if (!partRequest.part_number.trim() || !partRequest.quantity_requested) {
      toast.error("Please fill in all required fields");
      return;
    }
  
    const quantity = Number(partRequest.quantity_requested);
    if (isNaN(quantity) || quantity <= 0) {
      toast.error("Please enter a valid quantity");
      return;
    }
  
    setPartRequestLoading(true);
    try {
      const response = await api.post("/parts/part_request", {
        work_order_id: currentWorkOrderId.replace('WO', ''),
        part_number: partRequest.part_number.trim(),
        quantity_requested: quantity,
        station_number: partRequest.station_number,
        unit_number: partRequest.unit_number,
        requested_by: user.user_id,
        description: partRequest.description?.trim() || undefined
      });
  
      if (response.error) {
        throw new Error(response.error);
      }
  
      toast.success("Part request submitted successfully!");
      setShowPartRequestModal(false);
      
      // Refresh the missing parts list and work orders
    //   fetchMissingParts();

      fetchWorkOrdersAndUpdate();
      
      // Reset form
      setPartRequest({
        part_number: "",
        quantity_requested: "",
        unit_number: "1",
        station_number: "1",
        description: ""
      });
    } catch (error: any) {
      console.error("Error submitting part request:", error);
      toast.error(error.message || "Failed to submit part request");
    } finally {
      setPartRequestLoading(false);
    }
  };

  // Create Work Order handler
  async function handleCreateWorkOrder(e: React.FormEvent) {
    e.preventDefault();

    console.log("Creating with:", {
      product: createProductNumber,
      quantity: createQuantity,
    });

    try {
      const qty = Number(createQuantity);
      if (isNaN(qty) || qty <= 0) {
        throw new Error("Please enter a valid quantity (>0)");
      }

      await createWorkOrder(createProductNumber, qty);

      // Reset form on success
      setCreateProductNumber("");
      setCreateQuantity("");
      setShowCreateModal(false);
    } catch (error) {
      // Error already handled in createWorkOrder
      console.error("Creation failed:", error);
    }
  }

  return (
    <div>
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 mb-6">
        <div className="w-full sm:w-auto">
          <LiveStatusBar lastUpdated={lastUpdated} />
        </div>
        <Button
          onClick={() => setShowCreateModal(true)}
          className="w-full sm:w-auto flex items-center justify-center gap-2 bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-700 hover:to-blue-600 text-white shadow-md hover:shadow-lg transform hover:-translate-y-0.5 transition-all duration-200"
          size="sm"
        >
          <Plus className="w-4 h-4" />
          <span className="whitespace-nowrap">Create Work Order</span>
        </Button>
      </div>
      {/* Add this near your other modals */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 overflow-y-auto">
          <div className="bg-white rounded-lg p-4 sm:p-6 w-full max-w-md max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold">Create New Work Order</h3>
              <button
                onClick={() => setShowCreateModal(false)}
                className="text-gray-500 hover:text-gray-700"
                aria-label="Close"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateWorkOrder} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Product Number <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  value={createProductNumber}
                  onChange={(e) => setCreateProductNumber(e.target.value)}
                  placeholder="Enter product number"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Quantity <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  required
                  min="1"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  value={createQuantity}
                  onChange={(e) => setCreateQuantity(e.target.value)}
                  placeholder="Enter quantity"
                />
              </div>

              {error && <div className="text-red-500 text-sm">{error}</div>}

              <div className="flex justify-end space-x-3 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowCreateModal(false)}
                  disabled={creating}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  className="bg-blue-600 hover:bg-blue-700 text-white"
                  disabled={creating || !createProductNumber || !createQuantity}
                >
                  {creating ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Creating...
                    </>
                  ) : (
                    "Create Work Order"
                  )}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
      <div className="overflow-x-auto [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6 w-full min-w-0">
          {statusColumns.map((col) => (
            <div key={col.key} className="w-full min-w-0">
              <div className="flex items-center mb-2 px-2">
                <span className="font-semibold text-base md:text-lg">{col.label}</span>
                <span className="ml-2 text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">
                  {workOrders.filter(wo => wo.status === col.key).length}
                </span>
              </div>
              <div className="space-y-3 md:space-y-4">
                {workOrders
                  .filter((wo) => wo.status === col.key)
                  .map((wo) => (
                    <div
                      key={wo.work_order_id}
                      className={`bg-white rounded-lg shadow p-3 sm:p-4 cursor-pointer hover:shadow-md transition-all duration-200 border-2 ${
                        highlighted === wo.work_order_id
                          ? "border-yellow-400 bg-yellow-50 ring-2 ring-yellow-200"
                          : "border-transparent hover:border-blue-100"
                      }`}
                      onClick={() => handleCardClick(wo)}
                    >
                      <div className="flex items-start justify-between mb-1">
                        <div className="flex-1 min-w-0">
                          <h4 className="font-medium text-sm sm:text-base truncate">{wo.product_number}</h4>
                          <p className="text-xs text-gray-500 truncate">WO: {wo.work_order_id}</p>
                        </div>
                        <span
                          className={`ml-2 text-xs px-2 py-0.5 rounded-full whitespace-nowrap ${
                            statusColors[wo.status]
                          }`}
                        >
                          {wo.status}
                        </span>
                      </div>
                      <div className="text-xs text-gray-500 mb-2">
                        {wo.description}
                      </div>
                      <div className="w-full bg-gray-200 rounded h-2">
                        <div
                          className={`h-2 rounded ${
                            wo.progress === 100 ? "bg-green-500" : "bg-blue-500"
                          }`}
                          style={{ width: `${wo.progress}%` }}
                        ></div>
                      </div>
                      <div className="text-xs text-gray-500 mt-1">
                        Progress: {wo.progress}%
                      </div>
                      <div className="flex gap-2 mt-2">
                        {wo.status === "Pending" && (
                          <Button
                            size="sm"
                            variant="outline"
                            className="flex-1 border-2 border-blue-600 text-blue-600 hover:bg-blue-600 hover:text-white hover:border-blue-600 transition-colors duration-200"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleStartWork(wo.work_order_id);
                            }}
                          >
                            Start Working
                          </Button>
                        )}
                        {wo.status === "In Progress" && (
                          <Button
                            size="sm"
                            variant="outline"
                            className="flex-1 border-2 border-blue-600 bg-white text-blue-600 hover:bg-blue-600 hover:text-white hover:border-blue-600 transition-colors duration-200 font-medium text-sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              markWorkOrderComplete(wo.work_order_id);
                            }}
                          >
                            Mark Complete
                          </Button>
                        )}
                        {wo.status === "In Progress" && (
                          <div className="flex-1">
                            {/* part request UI will show in modal */}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
              </div>
            </div>
          ))}
        </div>
      </div>
      {/* Part Request Modal */}
      {showPartRequestModal && currentWorkOrderId && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold">
              Request Parts for {currentWorkOrderId}
              </h3>
              <button
                onClick={() => setShowPartRequestModal(false)}
                className="text-gray-500 hover:text-gray-700"
                aria-label="Close"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handlePartRequestSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Part Number <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  value={partRequest.part_number}
                  onChange={(e) =>
                    setPartRequest({
                      ...partRequest,
                      part_number: e.target.value,
                    })
                  }
                  placeholder="Enter part number"
                  disabled={partRequestLoading}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Quantity <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  required
                  min="1"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  value={partRequest.quantity_requested}
                  onChange={(e) =>
                    setPartRequest({
                      ...partRequest,
                      quantity_requested: e.target.value,
                    })
                  }
                  placeholder="Enter quantity"
                  disabled={partRequestLoading}
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Unit <span className="text-red-500">*</span>
                  </label>
                  <select
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    value={partRequest.unit_number}
                    onChange={(e) => {
                      const selectedUnit = selectedWO?.details?.units?.find(u => u.unit_number === e.target.value);
                      setPartRequest(prev => ({
                        ...prev,
                        unit_number: e.target.value,
                        // Reset station when unit changes
                        station_number: selectedUnit?.stations?.[0]?.station_number || '1'
                      }));
                    }}
                    disabled={partRequestLoading || !selectedWO?.details?.units?.length}
                  >
                    <option value="">Select a unit</option>
                    {selectedWO?.details?.units?.map((unit) => (
                      <option key={unit.unit_number} value={unit.unit_number}>
                        Unit {unit.unit_number}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Station <span className="text-red-500">*</span>
                  </label>
                  <select
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    value={partRequest.station_number}
                    onChange={(e) =>
                      setPartRequest(prev => ({
                        ...prev,
                        station_number: e.target.value,
                      }))
                    }
                    disabled={partRequestLoading || !partRequest.unit_number}
                  >
                    <option value="">Select a station</option>
                    {selectedWO?.details?.units
                      ?.find(u => u.unit_number === partRequest.unit_number)
                      ?.stations?.map((station) => (
                        <option key={station.station_number} value={station.station_number}>
                          Station {station.station_number}
                        </option>
                      )) || <option value="">No stations available</option>}
                  </select>
                </div>
              </div>
              
              {/* Station Part Requirements */}
              {selectedWO?.details?.units
                .find(u => u.unit_number === partRequest.unit_number)
                ?.stations.find(s => s.station_number === partRequest.station_number) && (
                <div className="mt-2 p-3 bg-gray-50 rounded-md border border-gray-200">
                  <h4 className="text-sm font-medium text-gray-700 mb-2">Station Requirements</h4>
                  <div className="space-y-1 text-sm text-gray-600">
                    <p>
                      <span className="font-medium">Current Part:</span>{' '}
                      {selectedWO.details.units
                        .find(u => u.unit_number === partRequest.unit_number)
                        ?.stations.find(s => s.station_number === partRequest.station_number)
                        ?.part_number || 'None specified'}
                    </p>
                    <p>
                      <span className="font-medium">Description:</span>{' '}
                      {selectedWO.details.units
                        .find(u => u.unit_number === partRequest.unit_number)
                        ?.stations.find(s => s.station_number === partRequest.station_number)
                        ?.part_description || 'No description available'}
                    </p>
                    <p>
                      <span className="font-medium">Required:</span>{' '}
                      {selectedWO.details.units
                        .find(u => u.unit_number === partRequest.unit_number)
                        ?.stations.find(s => s.station_number === partRequest.station_number)
                        ?.quantity_required || 0}
                    </p>
                    <p className="flex items-center">
                      <span className="font-medium mr-2">Status:</span>
                      <span className={`px-2 py-0.5 text-xs rounded-full ${
                        selectedWO.details.units
                          .find(u => u.unit_number === partRequest.unit_number)
                          ?.stations.find(s => s.station_number === partRequest.station_number)
                          ?.station_status === 'completed' 
                          ? 'bg-green-100 text-green-800' 
                          : 'bg-yellow-100 text-yellow-800'
                      }`}>
                        {selectedWO.details.units
                          .find(u => u.unit_number === partRequest.unit_number)
                          ?.stations.find(s => s.station_number === partRequest.station_number)
                          ?.station_status?.replace('_', ' ') || 'Not started'}
                      </span>
                    </p>
                  </div>
                </div>
              )}

              <div className="flex justify-end space-x-3 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowPartRequestModal(false)}
                  disabled={partRequestLoading}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  className="bg-blue-600 hover:bg-blue-700 text-white"
                  disabled={
                    partRequestLoading ||
                    !partRequest.part_number ||
                    !partRequest.quantity_requested
                  }
                >
                  {partRequestLoading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Processing...
                    </>
                  ) : (
                    "Request & Start Working"
                  )}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* Modal for work order details */}
      {selectedWO?.details && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black bg-opacity-40 overflow-y-auto">
          <div className="bg-white p-6 rounded-lg shadow-lg w-full max-w-3xl max-h-[90vh] overflow-y-auto relative animate-fade-in">
            <button
              className="absolute top-3 right-3 text-gray-400 hover:text-gray-600"
              onClick={handleCloseModal}
              aria-label="Close"
            >
              <X className="w-5 h-5" />
            </button>
            
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-4 pb-4 border-b">
              <div>
                <h3 className="font-semibold text-xl">
                  {selectedWO.product_number}
                </h3>
                <p className="text-gray-500">{selectedWO.description}</p>
              </div>
              <div className="flex items-center mt-2 md:mt-0">
                <span className={`text-sm px-3 py-1 rounded-full ${statusColors[selectedWO.status]} font-medium`}>
                  {selectedWO.status}
                </span>
              </div>
            </div>

            {/* Progress Bar */}
            <div className="mb-6">
              <div className="flex justify-between text-sm text-gray-600 mb-1">
                <span>Completion Progress</span>
                <span>{selectedWO.progress}%</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2.5">
                <div
                  className={`h-2.5 rounded-full ${
                    selectedWO.progress === 100 ? "bg-green-500" : "bg-blue-500"
                  }`}
                  style={{ width: `${selectedWO.progress}%` }}
                ></div>
              </div>
            </div>

            {/* Units and Stations */}
            <div className="mt-6">
              <h4 className="font-semibold text-lg mb-3">Production Units</h4>
              <div className="space-y-4">
                {selectedWO.details.units.map((unit) => (
                  <div key={unit.unit_number} className="border border-gray-200 rounded-lg p-4 shadow-sm">
                    <div className="font-medium text-gray-800 mb-3">
                      Unit {unit.unit_number}
                      <span className="ml-2 text-sm font-normal text-gray-500">
                        ({unit.stations.filter(s => s.unit_status === 'completed').length}/{unit.stations.length} stations completed)
                      </span>
                    </div>
                    <div className="space-y-3">
                      {unit.stations.map((station) => (
                        <div key={station.station_number} className="border-t border-gray-100 pt-3">
                          <div className="flex justify-between items-center">
                            <div className="font-medium text-gray-700">
                              Station {station.station_number}
                            </div>
                            <span 
                              className={`text-xs px-2.5 py-1 rounded-full ${
                                station.station_status === 'completed' 
                                  ? 'bg-green-100 text-green-800' 
                                  : station.station_status === 'in_progress'
                                    ? 'bg-blue-100 text-blue-800'
                                    : 'bg-yellow-100 text-yellow-800'
                              }`}
                            >
                              {station.station_status.replace('_', ' ')}
                            </span>
                          </div>
                          
                          <div className="mt-2 text-sm text-gray-600 space-y-1">
                            <div className="flex justify-between">
                              <span>Part:</span>
                              <span className="font-medium">
                                {station.part_number} - {station.part_description}
                              </span>
                            </div>
                            <div className="flex justify-between">
                              <span>Progress:</span>
                              <span className="font-medium">
                                {station.quantity_supplied}/{station.quantity_required} units
                              </span>
                            </div>
                            {station.station_comments && (
                              <div className="mt-1 pt-2 border-t border-gray-100">
                                <div className="font-medium text-gray-700">Notes:</div>
                                <p className="text-gray-600 italic">{station.station_comments}</p>
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
            </div>
            {/* Request Parts */}
            {selectedWO?.status === "In Progress" && (
              <div>
                <h4 className="font-semibold mb-2 flex items-center">
                  <Package className="w-4 h-4 mr-1" />
                  Request Parts
                </h4>
                <div className="space-y-1 mb-2">
                  {selectedWO?.partsRequested?.length === 0 && (
                    <div className="text-gray-400 text-sm">
                      No parts requested yet.
                    </div>
                  )}
                  {selectedWO?.partsRequested?.map((p, i) => (
                    <div key={i} className="text-sm text-gray-700">
                      Part #{p.part_number} &times; {p.quantity_requested}
                    </div>
                  ))}
                </div>
                <form className="flex gap-2" onSubmit={handleRequestPart}>
                  <input
                    type="text"
                    className="border rounded px-2 py-1 text-sm w-32"
                    placeholder="Part #"
                    value={partNumber}
                    onChange={(e) => setPartNumber(e.target.value)}
                    disabled={partRequestLoading}
                  />
                  <input
                    type="number"
                    className="border rounded px-2 py-1 text-sm w-20"
                    placeholder="Qty"
                    value={partQty}
                    onChange={(e) => setPartQty(e.target.value)}
                    min={1}
                    disabled={partRequestLoading}
                  />
                  <Button
                    type="submit"
                    size="sm"
                    className="border-2 border-blue-600 bg-transparent hover:bg-blue-50 text-blue-600 hover:text-blue-700 shadow-sm hover:shadow-md transition-all duration-200"
                    disabled={partRequestLoading}
                  >
                    {partRequestLoading ? (
                      <>
                        <svg
                          className="animate-spin -ml-1 mr-2 h-3 w-3 text-white"
                          xmlns="http://www.w3.org/2000/svg"
                          fill="none"
                          viewBox="0 0 24 24"
                        >
                          <circle
                            className="opacity-25"
                            cx="12"
                            cy="12"
                            r="10"
                            stroke="currentColor"
                            strokeWidth="4"
                          ></circle>
                          <path
                            className="opacity-75"
                            fill="currentColor"
                            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                          ></path>
                        </svg>
                        Requesting...
                      </>
                    ) : (
                      "Request"
                    )}
                  </Button>
                </form>
              </div>
            )}
          </div>

      )}
    </div>
  );
}
