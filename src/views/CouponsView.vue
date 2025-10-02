<template>
  <div class="coupons-view">
    <!-- Header -->
    <div class="coupons-header">
      <div>
        <h1 class="coupons-title">Coupon Management</h1>
        <p class="coupons-subtitle">
          Create and manage promotional coupons for free consultations
        </p>
      </div>
      <Button @click="showCreateModal = true" class="create-coupon-btn">
        <Plus class="h-4 w-4 mr-2" />
        Create Coupon
      </Button>
    </div>

    <!-- Stats Cards -->
    <div class="stats-grid">
      <div class="stat-card">
        <div class="stat-icon stat-icon--total">
          <Ticket class="h-6 w-6" />
        </div>
        <div class="stat-content">
          <div class="stat-value">{{ coupons.length }}</div>
          <div class="stat-label">Total Coupons</div>
        </div>
      </div>

      <div class="stat-card">
        <div class="stat-icon stat-icon--active">
          <CheckCircle class="h-6 w-6" />
        </div>
        <div class="stat-content">
          <div class="stat-value">{{ activeCoupons }}</div>
          <div class="stat-label">Active Coupons</div>
        </div>
      </div>

      <div class="stat-card">
        <div class="stat-icon stat-icon--used">
          <Users class="h-6 w-6" />
        </div>
        <div class="stat-content">
          <div class="stat-value">{{ usedCoupons }}</div>
          <div class="stat-label">Used Coupons</div>
        </div>
      </div>

      <div class="stat-card">
        <div class="stat-icon stat-icon--pending">
          <Clock class="h-6 w-6" />
        </div>
        <div class="stat-content">
          <div class="stat-value">{{ pendingCoupons }}</div>
          <div class="stat-label">Pending Approval</div>
        </div>
      </div>
    </div>

    <!-- Success/Error Messages -->
    <div v-if="showSuccessMessage" class="message-banner success-banner">
      <div class="message-icon success-icon">
        <CheckCircle class="h-4 w-4" />
      </div>
      <span>{{ messageText }}</span>
    </div>

    <div v-if="showErrorMessage" class="message-banner error-banner">
      <div class="message-icon error-icon">
        <AlertCircle class="h-4 w-4" />
      </div>
      <span>{{ messageText }}</span>
    </div>

    <!-- Admin Approval Section (Only for Admin Doctors) -->
    <div v-if="isAdmin" class="admin-section">
      <div class="admin-header">
        <h2>Coupon Approval Center</h2>
        <p>Review and manage coupons created by other doctors</p>
      </div>

      <!-- Tabs -->
      <div class="tabs-container">
        <div class="tabs-header">
          <button
            @click="activeTab = 'pending'"
            class="tab-btn"
            :class="{ active: activeTab === 'pending' }"
          >
            Pending Approval
            <span v-if="pendingApprovals.length > 0" class="tab-badge">{{
              pendingApprovals.length
            }}</span>
          </button>
          <button
            @click="activeTab = 'history'"
            class="tab-btn"
            :class="{ active: activeTab === 'history' }"
          >
            Approval History
            <span v-if="approvalHistory.length > 0" class="tab-badge">{{
              approvalHistory.length
            }}</span>
          </button>
        </div>

        <!-- Pending Tab -->
        <div v-if="activeTab === 'pending'" class="tab-content">
          <div v-if="pendingApprovals.length === 0" class="no-data">
            <CheckCircle class="h-12 w-12 text-green-500" />
            <p>No coupons pending approval</p>
          </div>

          <div v-else class="approval-table">
            <table>
              <thead>
                <tr>
                  <th>Doctor</th>
                  <th>Coupon Code</th>
                  <th>Description</th>
                  <th>Created</th>
                  <th>Expires</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="coupon in pendingApprovals" :key="coupon._id">
                  <td>
                    <div class="doctor-info">
                      <div class="doctor-name">{{ coupon.doctorId?.name }}</div>
                      <div class="doctor-specialty">
                        {{ coupon.doctorId?.specialties?.join(", ") }}
                      </div>
                    </div>
                  </td>
                  <td>
                    <code class="coupon-code">{{ coupon.code }}</code>
                  </td>
                  <td>{{ coupon.description }}</td>
                  <td>{{ formatDate(coupon.createdAt) }}</td>
                  <td>{{ formatDate(coupon.expiresAt) }}</td>
                  <td>
                    <div class="approval-actions">
                      <Button
                        @click="approveCoupon(coupon._id)"
                        size="sm"
                        class="approve-btn"
                      >
                        <CheckCircle class="h-4 w-4 mr-1" />
                        Approve
                      </Button>
                      <Button
                        @click="rejectCoupon(coupon._id)"
                        variant="destructive"
                        size="sm"
                        class="reject-btn"
                      >
                        <X class="h-4 w-4 mr-1" />
                        Reject
                      </Button>
                    </div>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        <!-- History Tab -->
        <div v-if="activeTab === 'history'" class="tab-content">
          <div v-if="approvalHistory.length === 0" class="no-data">
            <Clock class="h-12 w-12 text-gray-400" />
            <p>No approval history yet</p>
          </div>

          <div v-else class="approval-table">
            <table>
              <thead>
                <tr>
                  <th>Doctor</th>
                  <th>Coupon Code</th>
                  <th>Description</th>
                  <th>Status</th>
                  <th>Decision Date</th>
                  <th>Approved By</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="coupon in approvalHistory" :key="coupon._id">
                  <td>
                    <div class="doctor-info">
                      <div class="doctor-name">{{ coupon.doctorId?.name }}</div>
                      <div class="doctor-specialty">
                        {{ coupon.doctorId?.specialties?.join(", ") }}
                      </div>
                    </div>
                  </td>
                  <td>
                    <code class="coupon-code">{{ coupon.code }}</code>
                  </td>
                  <td>{{ coupon.description }}</td>
                  <td>
                    <span
                      class="status-badge"
                      :class="`status-${coupon.status}`"
                    >
                      {{ coupon.statusDisplay }}
                    </span>
                  </td>
                  <td>
                    {{
                      formatDate(coupon.approvedAt || coupon.rejectedAt || "")
                    }}
                  </td>
                  <td>{{ coupon.approvedBy?.name || "-" }}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>

    <!-- Coupons Table -->
    <div class="coupons-table-container">
      <div class="table-header">
        <h2>Your Coupons</h2>
        <div class="table-filters">
          <select
            v-model="selectedStatus"
            @change="filterCoupons"
            class="status-filter"
          >
            <option value="">All Status</option>
            <option value="unconfirmed">Pending Approval</option>
            <option value="active">Active</option>
            <option value="used">Used</option>
            <option value="rejected">Rejected</option>
            <option value="expired">Expired</option>
          </select>
        </div>
      </div>

      <div v-if="loading" class="loading-state">
        <Loader2 class="h-8 w-8 animate-spin" />
        <span>Loading coupons...</span>
      </div>

      <div v-else-if="filteredCoupons.length === 0" class="empty-state">
        <Ticket class="h-16 w-16 text-gray-300" />
        <h3>No coupons found</h3>
        <p>Create your first coupon to start offering free consultations</p>
        <Button @click="showCreateModal = true" variant="outline">
          <Plus class="h-4 w-4 mr-2" />
          Create Coupon
        </Button>
      </div>

      <div v-else class="coupons-table">
        <table>
          <thead>
            <tr>
              <th>Coupon Code</th>
              <th>Description</th>
              <th>Status</th>
              <th>Created</th>
              <th>Expires</th>
              <th>Used By</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="coupon in filteredCoupons" :key="coupon._id">
              <td>
                <div class="coupon-code">
                  <code>{{ coupon.code }}</code>
                  <button
                    @click="copyCouponCode(coupon.code)"
                    class="copy-btn"
                    title="Copy coupon code"
                  >
                    <Copy class="h-4 w-4" />
                  </button>
                </div>
              </td>
              <td>{{ coupon.description }}</td>
              <td>
                <span class="status-badge" :class="`status-${coupon.status}`">
                  {{ coupon.statusDisplay }}
                </span>
              </td>
              <td>{{ formatDate(coupon.createdAt) }}</td>
              <td>{{ formatDate(coupon.expiresAt) }}</td>
              <td>
                <span v-if="coupon.usedBy">
                  {{ coupon.usedBy.firstName }} {{ coupon.usedBy.lastName }}
                  <br />
                  <small>{{ formatDate(coupon.usedAt) }}</small>
                </span>
                <span v-else class="text-gray-500">Not used</span>
              </td>
              <td>
                <div class="actions">
                  <Button
                    v-if="coupon.status !== 'used'"
                    @click="deleteCoupon(coupon._id)"
                    variant="destructive"
                    size="sm"
                  >
                    <Trash2 class="h-4 w-4" />
                  </Button>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- Create Coupon Modal -->
    <div
      v-if="showCreateModal"
      class="modal-overlay"
      @click.self="closeCreateModal"
    >
      <div class="modal">
        <div class="modal-header">
          <h3>Create New Coupon</h3>
          <button @click="closeCreateModal" class="modal-close">
            <X class="h-4 w-4" />
          </button>
        </div>

        <div class="modal-content">
          <div class="form-group">
            <label for="description">Description</label>
            <input
              id="description"
              v-model="newCoupon.description"
              type="text"
              placeholder="Free consultation coupon"
              maxlength="200"
              class="form-input"
            />
            <small class="form-help"
              >Brief description of what this coupon offers</small
            >
          </div>

          <div class="form-group">
            <label for="expiresAt">Expiration Date</label>
            <input
              id="expiresAt"
              v-model="newCoupon.expiresAt"
              type="date"
              :min="tomorrow"
              class="form-input"
            />
            <small class="form-help"
              >When this coupon expires (default: 30 days)</small
            >
          </div>

          <div class="coupon-preview">
            <h4>Preview</h4>
            <div class="preview-coupon">
              <div class="preview-code">TELE000XXX</div>
              <div class="preview-description">
                {{ newCoupon.description || "Free consultation coupon" }}
              </div>
              <div class="preview-expires">
                Expires: {{ formatDate(newCoupon.expiresAt) || "In 30 days" }}
              </div>
            </div>
          </div>

          <div class="approval-notice">
            <AlertCircle class="h-4 w-4" />
            <span>Coupons require admin approval before becoming active</span>
          </div>
        </div>

        <div class="modal-actions">
          <Button @click="closeCreateModal" variant="outline">Cancel</Button>
          <Button @click="createNewCoupon" :disabled="isCreating">
            <span v-if="isCreating">Creating...</span>
            <span v-else>Create Coupon</span>
          </Button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from "vue";
import { Button } from "@/components/ui/button";
import {
  Ticket,
  Plus,
  CheckCircle,
  Users,
  Clock,
  Copy,
  Trash2,
  X,
  AlertCircle,
  Loader2,
} from "lucide-vue-next";
import { useDoctorAuth } from "@/composables/useDoctorAuth";

interface Coupon {
  _id: string;
  code: string;
  description: string;
  status: "unconfirmed" | "active" | "used" | "expired" | "rejected";
  statusDisplay: string;
  createdAt: string;
  expiresAt: string;
  updatedAt?: string;
  doctorId?: {
    _id: string;
    name: string;
    email: string;
    specialties?: string[];
  };
  usedBy?: {
    firstName: string;
    lastName: string;
  };
  usedAt?: string;
  approvedBy?: {
    name: string;
  };
  approvedAt?: string;
  rejectedAt?: string;
}

const { makeAuthenticatedRequest, doctor } = useDoctorAuth();

// State
const coupons = ref<Coupon[]>([]);
const pendingApprovals = ref<Coupon[]>([]);
const approvalHistory = ref<Coupon[]>([]);
const loading = ref(true);
const selectedStatus = ref("");
const showCreateModal = ref(false);
const isCreating = ref(false);

// UI Messages
const showSuccessMessage = ref(false);
const showErrorMessage = ref(false);
const messageText = ref("");
const activeTab = ref<"pending" | "history">("pending");

// Check if current doctor is admin
const isAdmin = computed(() => doctor.value?.isAdmin || false);

// New coupon form
const newCoupon = ref({
  description: "",
  expiresAt: "",
});

// Computed
const filteredCoupons = computed(() => {
  if (!selectedStatus.value) return coupons.value;
  return coupons.value.filter((c) => c.status === selectedStatus.value);
});

const activeCoupons = computed(
  () => coupons.value.filter((c) => c.status === "active").length
);

const usedCoupons = computed(
  () => coupons.value.filter((c) => c.status === "used").length
);

const pendingCoupons = computed(
  () => coupons.value.filter((c) => c.status === "unconfirmed").length
);

const tomorrow = computed(() => {
  const date = new Date();
  date.setDate(date.getDate() + 1);
  return date.toISOString().split("T")[0];
});

// Message functions
const showSuccess = (message: string) => {
  messageText.value = message;
  showSuccessMessage.value = true;
  setTimeout(() => {
    showSuccessMessage.value = false;
  }, 4000);
};

const showError = (message: string) => {
  messageText.value = message;
  showErrorMessage.value = true;
  setTimeout(() => {
    showErrorMessage.value = false;
  }, 4000);
};

// Methods
const fetchCoupons = async () => {
  try {
    loading.value = true;

    // Fetch doctor's own coupons
    const response = await makeAuthenticatedRequest("/api/coupons/my-coupons");

    if (response.success) {
      coupons.value = response.data || [];
    } else {
      console.error("Failed to fetch coupons:", response.message);
    }

    // If admin, also fetch pending approvals
    if (isAdmin.value) {
      await fetchPendingApprovals();
    }
  } catch (error) {
    console.error("Error fetching coupons:", error);
  } finally {
    loading.value = false;
  }
};

const fetchPendingApprovals = async () => {
  try {
    // Fetch pending approvals
    const pendingResponse = await makeAuthenticatedRequest(
      "/api/coupons/admin/all?status=unconfirmed"
    );

    if (pendingResponse.success) {
      pendingApprovals.value = pendingResponse.data || [];
    }

    // Fetch approval history (approved + rejected)
    const [approvedResponse, rejectedResponse] = await Promise.all([
      makeAuthenticatedRequest("/api/coupons/admin/all?status=active"),
      makeAuthenticatedRequest("/api/coupons/admin/all?status=rejected"),
    ]);

    const approvedCoupons = approvedResponse.success
      ? approvedResponse.data || []
      : [];
    const rejectedCoupons = rejectedResponse.success
      ? rejectedResponse.data || []
      : [];

    approvalHistory.value = [...approvedCoupons, ...rejectedCoupons].sort(
      (a, b) =>
        new Date(b.updatedAt || b.createdAt).getTime() -
        new Date(a.updatedAt || a.createdAt).getTime()
    );
  } catch (error) {
    console.error("Error fetching approval data:", error);
  }
};

const approveCoupon = async (couponId: string) => {
  try {
    const response = await makeAuthenticatedRequest(
      `/api/coupons/admin/${couponId}/status`,
      {
        method: "PUT",
        body: JSON.stringify({ status: "active" }),
      }
    );

    if (response.success) {
      await fetchPendingApprovals(); // Refresh both pending and history
      showSuccess("Coupon approved successfully!");
    } else {
      showError(`Failed to approve coupon: ${response.message}`);
    }
  } catch (error) {
    console.error("Error approving coupon:", error);
    showError("Failed to approve coupon. Please try again.");
  }
};

const rejectCoupon = async (couponId: string) => {
  const reason = prompt("Reason for rejection (optional):");

  try {
    const response = await makeAuthenticatedRequest(
      `/api/coupons/admin/${couponId}/status`,
      {
        method: "PUT",
        body: JSON.stringify({
          status: "rejected",
          rejectionReason: reason || "No reason provided",
        }),
      }
    );

    if (response.success) {
      await fetchPendingApprovals(); // Refresh both pending and history
      showSuccess("Coupon rejected successfully!");
    } else {
      showError(`Failed to reject coupon: ${response.message}`);
    }
  } catch (error) {
    console.error("Error rejecting coupon:", error);
    showError("Failed to reject coupon. Please try again.");
  }
};

const createNewCoupon = async () => {
  try {
    isCreating.value = true;

    const payload: any = {};
    if (newCoupon.value.description) {
      payload.description = newCoupon.value.description;
    }
    if (newCoupon.value.expiresAt) {
      payload.expiresAt = new Date(newCoupon.value.expiresAt).toISOString();
    }

    const response = await makeAuthenticatedRequest("/api/coupons/create", {
      method: "POST",
      body: JSON.stringify(payload),
    });

    if (response.success) {
      await fetchCoupons(); // Refresh list
      closeCreateModal();

      const message = isAdmin.value
        ? `Coupon ${response.data.code} created and activated successfully!`
        : `Coupon ${response.data.code} created successfully! Awaiting admin approval.`;

      showSuccess(message);
    } else {
      showError(`Failed to create coupon: ${response.message}`);
    }
  } catch (error) {
    console.error("Error creating coupon:", error);
    showError("Failed to create coupon. Please try again.");
  } finally {
    isCreating.value = false;
  }
};

const deleteCoupon = async (couponId: string) => {
  if (!confirm("Are you sure you want to delete this coupon?")) return;

  try {
    const response = await makeAuthenticatedRequest(
      `/api/coupons/${couponId}`,
      {
        method: "DELETE",
      }
    );

    if (response.success) {
      await fetchCoupons(); // Refresh list
      showSuccess("Coupon deleted successfully!");
    } else {
      showError(`Failed to delete coupon: ${response.message}`);
    }
  } catch (error) {
    console.error("Error deleting coupon:", error);
    showError("Failed to delete coupon. Please try again.");
  }
};

const copyCouponCode = (code: string) => {
  if (code) {
    navigator.clipboard.writeText(code);
    showSuccess(`Coupon code ${code} copied to clipboard!`);
  }
};

const filterCoupons = () => {
  // Reactive computed handles filtering
};

const closeCreateModal = () => {
  showCreateModal.value = false;
  newCoupon.value = {
    description: "",
    expiresAt: "",
  };
};

const formatDate = (dateString: string | undefined) => {
  if (!dateString) return "";
  return new Date(dateString).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
};

onMounted(() => {
  fetchCoupons();
});
</script>

<style scoped>
.coupons-view {
  padding: 2rem;
  max-width: 1200px;
  margin: 0 auto;
}

.coupons-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 2rem;
  gap: 1rem;
}

.coupons-title {
  font-size: 2rem;
  font-weight: 700;
  color: #1f2937;
  margin: 0 0 0.5rem 0;
}

.coupons-subtitle {
  color: #6b7280;
  font-size: 1rem;
  margin: 0;
}

.create-coupon-btn {
  background: #3b82f6;
  color: white;
  border: none;
  padding: 0.75rem 1.5rem;
  border-radius: 0.5rem;
  font-weight: 500;
  cursor: pointer;
  display: flex;
  align-items: center;
  transition: all 0.2s ease;
}

.create-coupon-btn:hover {
  background: #2563eb;
}

/* Stats Grid */
.stats-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: 1.5rem;
  margin-bottom: 2rem;
}

.stat-card {
  background: white;
  border: 1px solid #e5e7eb;
  border-radius: 0.75rem;
  padding: 1.5rem;
  display: flex;
  align-items: center;
  gap: 1rem;
}

.stat-icon {
  width: 3rem;
  height: 3rem;
  border-radius: 0.75rem;
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
}

.stat-icon--total {
  background: #6366f1;
}
.stat-icon--active {
  background: #10b981;
}
.stat-icon--used {
  background: #f59e0b;
}
.stat-icon--pending {
  background: #8b5cf6;
}

.stat-content {
  flex: 1;
}

.stat-value {
  font-size: 2rem;
  font-weight: 700;
  color: #1f2937;
  line-height: 1;
}

.stat-label {
  color: #6b7280;
  font-size: 0.875rem;
  margin-top: 0.25rem;
}

/* Message Banners */
.message-banner {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 1rem 1.5rem;
  border-radius: 0.5rem;
  margin-bottom: 1.5rem;
  font-size: 0.875rem;
  font-weight: 500;
  animation: messageSlideIn 0.3s ease-out;
}

.success-banner {
  background: #f0fdf4;
  border: 1px solid #bbf7d0;
  color: #166534;
}

.error-banner {
  background: #fef2f2;
  border: 1px solid #fecaca;
  color: #991b1b;
}

.message-icon {
  flex-shrink: 0;
}

.success-icon {
  color: #16a34a;
}

.error-icon {
  color: #dc2626;
}

@keyframes messageSlideIn {
  from {
    opacity: 0;
    transform: translateY(-10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

/* Admin Section */
.admin-section {
  background: white;
  border: 1px solid #e5e7eb;
  border-radius: 0.75rem;
  margin-bottom: 2rem;
  overflow: hidden;
}

.admin-header {
  padding: 1.5rem;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
}

.admin-header h2 {
  font-size: 1.25rem;
  font-weight: 600;
  margin: 0 0 0.25rem 0;
}

.admin-header p {
  margin: 0;
  opacity: 0.9;
  font-size: 0.875rem;
}

/* Tabs */
.tabs-container {
  background: white;
}

.tabs-header {
  display: flex;
  border-bottom: 1px solid #e5e7eb;
  background: #f9fafb;
}

.tab-btn {
  flex: 1;
  padding: 1rem 1.5rem;
  background: none;
  border: none;
  font-weight: 500;
  color: #6b7280;
  cursor: pointer;
  transition: all 0.2s ease;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  border-bottom: 3px solid transparent;
}

.tab-btn.active {
  color: #3b82f6;
  border-bottom-color: #3b82f6;
  background: white;
}

.tab-btn:hover:not(.active) {
  color: #374151;
  background: #f3f4f6;
}

.tab-badge {
  background: #3b82f6;
  color: white;
  padding: 0.125rem 0.5rem;
  border-radius: 9999px;
  font-size: 0.75rem;
  font-weight: 600;
  min-width: 1.25rem;
  text-align: center;
}

.tab-btn:not(.active) .tab-badge {
  background: #6b7280;
}

.tab-content {
  min-height: 200px;
}

.no-data {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 3rem;
  gap: 1rem;
}

.no-data p {
  color: #6b7280;
  margin: 0;
}

.approval-table {
  overflow-x: auto;
}

.approval-table table {
  width: 100%;
  border-collapse: collapse;
}

.approval-table th {
  background: #f9fafb;
  padding: 1rem;
  text-align: left;
  font-weight: 600;
  color: #374151;
  border-bottom: 1px solid #e5e7eb;
}

.approval-table td {
  padding: 1rem;
  border-bottom: 1px solid #f3f4f6;
  vertical-align: top;
}

.doctor-info {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.doctor-name {
  font-weight: 500;
  color: #1f2937;
}

.doctor-specialty {
  font-size: 0.75rem;
  color: #6b7280;
}

.approval-actions {
  display: flex;
  gap: 0.5rem;
}

.approve-btn {
  background: #10b981;
  color: white;
}

.approve-btn:hover {
  background: #059669;
}

.reject-btn {
  background: #ef4444;
  color: white;
}

.reject-btn:hover {
  background: #dc2626;
}

/* Table */
.coupons-table-container {
  background: white;
  border: 1px solid #e5e7eb;
  border-radius: 0.75rem;
  overflow: hidden;
}

.table-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1.5rem;
  border-bottom: 1px solid #e5e7eb;
  background: #f9fafb;
}

.table-header h2 {
  font-size: 1.25rem;
  font-weight: 600;
  color: #1f2937;
  margin: 0;
}

.status-filter {
  padding: 0.5rem 0.75rem;
  border: 1px solid #d1d5db;
  border-radius: 0.375rem;
  background: white;
  font-size: 0.875rem;
}

.loading-state,
.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 3rem;
  gap: 1rem;
}

.empty-state h3 {
  font-size: 1.25rem;
  font-weight: 600;
  color: #1f2937;
  margin: 0;
}

.empty-state p {
  color: #6b7280;
  text-align: center;
  margin: 0;
}

.coupons-table {
  overflow-x: auto;
}

.coupons-table table {
  width: 100%;
  border-collapse: collapse;
}

.coupons-table th {
  background: #f9fafb;
  padding: 1rem;
  text-align: left;
  font-weight: 600;
  color: #374151;
  border-bottom: 1px solid #e5e7eb;
}

.coupons-table td {
  padding: 1rem;
  border-bottom: 1px solid #f3f4f6;
  vertical-align: top;
}

.coupon-code {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.coupon-code code {
  background: #f3f4f6;
  padding: 0.25rem 0.5rem;
  border-radius: 0.25rem;
  font-family: "Monaco", "Menlo", monospace;
  font-weight: 600;
  color: #1f2937;
}

.copy-btn {
  background: none;
  border: none;
  padding: 0.25rem;
  border-radius: 0.25rem;
  color: #6b7280;
  cursor: pointer;
  transition: all 0.2s ease;
}

.copy-btn:hover {
  background: #f3f4f6;
  color: #374151;
}

.status-badge {
  display: inline-block;
  padding: 0.25rem 0.75rem;
  border-radius: 9999px;
  font-size: 0.75rem;
  font-weight: 500;
  text-transform: uppercase;
}

.status-unconfirmed {
  background: #fef3c7;
  color: #92400e;
}

.status-active {
  background: #d1fae5;
  color: #065f46;
}

.status-used {
  background: #e0e7ff;
  color: #3730a3;
}

.status-rejected {
  background: #fee2e2;
  color: #991b1b;
}

.status-expired {
  background: #f3f4f6;
  color: #374151;
}

.actions {
  display: flex;
  gap: 0.5rem;
}

/* Modal */
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  padding: 1rem;
}

.modal {
  background: white;
  border-radius: 0.75rem;
  max-width: 500px;
  width: 100%;
  box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1);
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1.5rem;
  border-bottom: 1px solid #e5e7eb;
}

.modal-header h3 {
  font-size: 1.25rem;
  font-weight: 600;
  color: #1f2937;
  margin: 0;
}

.modal-close {
  background: none;
  border: none;
  padding: 0.5rem;
  border-radius: 0.375rem;
  color: #6b7280;
  cursor: pointer;
  transition: all 0.2s ease;
}

.modal-close:hover {
  background: #f3f4f6;
}

.modal-content {
  padding: 1.5rem;
}

.form-group {
  margin-bottom: 1.5rem;
}

.form-group label {
  display: block;
  font-weight: 500;
  color: #374151;
  margin-bottom: 0.5rem;
}

.form-input {
  width: 100%;
  padding: 0.75rem;
  border: 1px solid #d1d5db;
  border-radius: 0.375rem;
  font-size: 0.875rem;
  transition: border-color 0.2s ease;
}

.form-input:focus {
  outline: none;
  border-color: #3b82f6;
  box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
}

.form-help {
  display: block;
  color: #6b7280;
  font-size: 0.75rem;
  margin-top: 0.25rem;
}

.coupon-preview {
  background: #f8fafc;
  border: 1px solid #e2e8f0;
  border-radius: 0.5rem;
  padding: 1rem;
  margin-bottom: 1rem;
}

.coupon-preview h4 {
  font-size: 0.875rem;
  font-weight: 600;
  color: #374151;
  margin: 0 0 0.75rem 0;
}

.preview-coupon {
  background: white;
  border: 2px dashed #3b82f6;
  border-radius: 0.5rem;
  padding: 1rem;
  text-align: center;
}

.preview-code {
  font-family: "Monaco", "Menlo", monospace;
  font-weight: 700;
  font-size: 1.25rem;
  color: #3b82f6;
  margin-bottom: 0.5rem;
}

.preview-description {
  color: #374151;
  font-size: 0.875rem;
  margin-bottom: 0.25rem;
}

.preview-expires {
  color: #6b7280;
  font-size: 0.75rem;
}

.approval-notice {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  background: #fef3c7;
  border: 1px solid #fcd34d;
  border-radius: 0.375rem;
  padding: 0.75rem;
  color: #92400e;
  font-size: 0.875rem;
}

.modal-actions {
  display: flex;
  gap: 0.75rem;
  padding: 1.5rem;
  border-top: 1px solid #e5e7eb;
  justify-content: flex-end;
}

/* Responsive */
@media (max-width: 768px) {
  .coupons-view {
    padding: 1rem;
  }

  .coupons-header {
    flex-direction: column;
    align-items: stretch;
  }

  .stats-grid {
    grid-template-columns: repeat(2, 1fr);
  }

  .coupons-table {
    font-size: 0.875rem;
  }

  .coupons-table th,
  .coupons-table td {
    padding: 0.75rem 0.5rem;
  }
}
</style>
