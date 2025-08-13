import { useState, useRef, useEffect } from "react";
import type React from "react";
import { MessageCircle, Package, X, Plus, Loader2 } from "lucide-react";
import { Button } from "../ui/button";
import LiveStatusBar from "./LiveStatusBar";
import { useApi } from "@/contexts/AuthContext";
import { useAuth } from "@/contexts/AuthContext";
import toast from "react-hot-toast";

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

interface Comment {
  user: string;
  text: string;
  time: string;
  station_number: string;
  unit_number?: string;
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
  comments: Comment[];
  partsRequested: { part: string; qty: number }[];
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
  const [comment, setComment] = useState("");
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
  });
  const [showPartRequestModal, setShowPartRequestModal] = useState(false);
  const [currentWorkOrderId, setCurrentWorkOrderId] = useState<string | null>(
    null
  );
  const [partRequestLoading, setPartRequestLoading] = useState(false);
  const highlightTimeout = useRef<NodeJS.Timeout | null>(null);
  //   const [comments, setComments] = useState<Comment[]>([]);
  const [commentStation, setCommentStation] = useState("1"); // Default to Station 1
  const [commentUnit, setCommentUnit] = useState("1"); // Default to Unit 1

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
    setCurrentWorkOrderId(workOrderId);
    setShowPartRequestModal(true);
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
    setComment("");
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

  const postComment = async (
    workOrderId: string,
    unitNumber: number,
    stationNumber: string,
    commentText: string
  ) => {
    try {
      const response = await api.put(
        `/workorders/${workOrderId}/units/${unitNumber}/stations/${stationNumber}/comment`,
        { comment: commentText }
      );

      if (response.message === "Comment updated successfully") {
        return true;
      }
      throw new Error(response.error || "Failed to post comment");
    } catch (error) {
      console.error("Error posting comment:", error);
      toast.error("Failed to post comment");
      return false;
    }
  };

  const handleAddComment = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!comment.trim() || !selectedWO || !user) return;

    const success = await postComment(
      selectedWO.work_order_id,
      1, // Using unit_number = 1 as default (adjust if you have multiple units)
      commentStation, // The selected station from state
      comment
    );

    if (success) {
      // Update local state to show the new comment immediately
      setWorkOrders((prev) =>
        prev.map((wo) =>
          wo.work_order_id === selectedWO.work_order_id
            ? {
                ...wo,
                comments: [
                  ...wo.comments,
                  {
                    user: `${user.first_name} ${user.last_name}`,
                    text: comment,
                    time: new Date().toLocaleTimeString([], {
                      hour: "2-digit",
                      minute: "2-digit",
                    }),
                    station_number: commentStation,
                    unit_number: "1", // Changed from number to string
                  },
                ],
              }
            : wo
        )
      );
      setHighlighted(selectedWO.work_order_id);
      setComment("");
      if (highlightTimeout.current) clearTimeout(highlightTimeout.current);
      highlightTimeout.current = setTimeout(() => setHighlighted(null), 1200);
    }
  };

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
          comments: [],
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

  function handleRequestPart(e: React.FormEvent<HTMLFormElement>) {
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
  }

  const handlePartRequestSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentWorkOrderId) return;
    setPartRequestLoading(true);

    try {
      await api.post("/parts/part_request", {
        work_order_id: currentWorkOrderId,
        part_number: partRequest.part_number,
        quantity_requested: Number(partRequest.quantity_requested),
        station_number: partRequest.station_number,
        requested_by: user?.user_id,
      });

      setWorkOrders((prev) =>
        prev.map((wo) =>
          wo.work_order_id === currentWorkOrderId
            ? { ...wo, status: "In Progress" }
            : wo
        )
      );

      toast.success(
        "Parts requested successfully! Work order moved to In Progress."
      );
      setShowPartRequestModal(false);
    } catch (error) {
      toast.error("Failed to request parts");
      console.error("Part request error:", error);
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
                Request Parts to Start Work
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
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Station Number <span className="text-red-500">*</span>
                </label>
                <select
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  value={partRequest.station_number}
                  onChange={(e) =>
                    setPartRequest({
                      ...partRequest,
                      station_number: e.target.value,
                    })
                  }
                >
                  <option value="1">Station 1</option>
                  <option value="2">Station 2</option>
                  <option value="3">Station 3</option>
                </select>
              </div>

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
      {selectedWO && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black bg-opacity-40 overflow-y-auto">
          <div className="bg-white p-6 rounded-lg shadow-lg w-full max-w-lg max-h-[90vh] overflow-y-auto relative animate-fade-in">
            <button
              className="absolute top-3 right-3 text-gray-400 hover:text-gray-600"
              onClick={handleCloseModal}
              aria-label="Close"
            >
              <X className="w-5 h-5" />
            </button>
            <div className="flex items-center mb-2">
              <h3 className="font-semibold text-lg mr-3">
                {selectedWO.product_number}
              </h3>
              <span
                className={`text-xs px-2 py-0.5 rounded-full ${
                  statusColors[selectedWO.status]
                }`}
              >
                {selectedWO.status}
              </span>
            </div>
            <div className="text-gray-500 mb-2">{selectedWO.description}</div>
            <div className="mb-4">
              <div className="w-full bg-gray-200 rounded h-2">
                <div
                  className={`h-2 rounded ${
                    selectedWO.progress === 100 ? "bg-green-500" : "bg-blue-500"
                  }`}
                  style={{ width: `${selectedWO.progress}%` }}
                ></div>
              </div>
              <div className="text-xs text-gray-500 mt-1">
                Progress: {selectedWO.progress}%
              </div>
            </div>
            {/* Comments */}
            <div className="mb-6">
              <h4 className="font-semibold mb-2 flex items-center">
                <MessageCircle className="w-4 h-4 mr-1" />
                Comments
              </h4>
              <div className="space-y-2 max-h-32 overflow-y-auto mb-2">
                {selectedWO.comments.length === 0 && (
                  <div className="text-gray-400 text-sm">No comments yet.</div>
                )}
                {selectedWO.comments.map((c, i) => (
                  <div key={i} className="bg-gray-50 rounded px-3 py-2 text-sm">
                    <div className="flex justify-between">
                      <span className="font-medium text-gray-700">
                        {c.user}
                      </span>
                      <span className="text-xs text-gray-400">{c.time}</span>
                    </div>
                    <p className="mt-1">{c.text}</p>
                    <div className="text-xs text-gray-500 mt-1">
                      Unit {c.unit_number} • Station {c.station_number}
                    </div>
                  </div>
                ))}
              </div>
              <form onSubmit={handleAddComment} className="space-y-2">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Unit
                </label>
                <select
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm bg-white"
                  value={commentUnit}
                  disabled
                >
                  <option value="1">Unit 1</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Station
                </label>
                <select
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm bg-white"
                  value={commentStation}
                  onChange={(e) => setCommentStation(e.target.value)}
                >
                  <option value="1">Station 1</option>
                  <option value="2">Station 2</option>
                  <option value="3">Station 3</option>
                </select>
              </div>
            </div>
                <div className="flex gap-2 mt-2">
                  <input
                    type="text"
                    className="flex-1 border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Add a comment..."
                    value={comment}
                    onChange={(e) => setComment(e.target.value)}
                    aria-label="Comment text"
                  />
                  <Button
                    type="submit"
                    size="sm"
                    className="h-auto px-4 py-2 border-2 border-blue-600 bg-white text-blue-600 hover:bg-blue-600 hover:text-white hover:border-blue-600 shadow-sm hover:shadow-md transition-all duration-200"
                    aria-label="Send comment"
                  >
                    <span className="hidden sm:inline">Send</span>
                    <MessageCircle className="w-4 h-4 sm:hidden" />
                  </Button>
                </div>
              </form>
            </div>
            {/* Request Parts */}
            {selectedWO.status === "In Progress" && (
              <div>
                <h4 className="font-semibold mb-2 flex items-center">
                  <Package className="w-4 h-4 mr-1" />
                  Request Parts
                </h4>
                <div className="space-y-1 mb-2">
                  {selectedWO.partsRequested.length === 0 && (
                    <div className="text-gray-400 text-sm">
                      No parts requested yet.
                    </div>
                  )}
                  {selectedWO.partsRequested.map((p, i) => (
                    <div key={i} className="text-sm text-gray-700">
                      Part #{p.part} &times; {p.qty}
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
        </div>
      )}
    </div>
  );
}
