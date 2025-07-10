<template>
  <div class="space-y-6">
    <!-- Loading State -->
    <div v-if="isLoading" class="flex items-center justify-center p-8">
      <Loader2 class="h-8 w-8 animate-spin mr-2" />
      <span>Loading patient details...</span>
    </div>

    <!-- Error State -->
    <div v-else-if="error" class="text-center py-8">
      <div
        class="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative flex items-center justify-center gap-2"
      >
        <AlertTriangle class="h-4 w-4" />
        <span>{{ error }}</span>
      </div>
    </div>

    <!-- Patient Not Found -->
    <div v-else-if="!patient" class="text-center py-8">
      <div
        class="bg-yellow-100 border border-yellow-400 text-yellow-700 px-4 py-3 rounded relative flex items-center justify-center gap-2"
      >
        <AlertTriangle class="h-4 w-4" />
        <span>Patient not found</span>
      </div>
    </div>

    <!-- Main Content -->
    <div v-else class="space-y-6">
      <!-- Header with Patient Info -->
      <div class="bg-card rounded-lg border border-border p-6">
        <div class="flex items-center justify-between mb-6">
          <Button @click="goBack" variant="ghost" size="sm">
            <ArrowLeft class="h-4 w-4 mr-2" />
            Back to Patients
          </Button>
          <div class="flex gap-2">
            <Button @click="refreshPatient" variant="outline" size="sm">
              <RefreshCw
                :class="cn('mr-2 h-4 w-4', isLoading && 'animate-spin')"
              />
              Refresh
            </Button>
          </div>
        </div>

        <div class="flex items-start space-x-6">
          <!-- Patient Avatar -->
          <div class="flex-shrink-0">
            <div
              class="w-20 h-20 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center"
            >
              <User class="h-10 w-10 text-white" />
            </div>
          </div>

          <!-- Patient Details -->
          <div class="flex-1">
            <div class="flex items-center space-x-4 mb-3">
              <h1 class="text-2xl font-bold text-foreground">
                {{ patient.firstName }} {{ patient.lastName }}
              </h1>
              <div
                class="flex items-center text-xs text-green-600 bg-green-50 px-3 py-1 rounded-full"
              >
                <div class="w-2 h-2 bg-green-500 rounded-full mr-1"></div>
                Active Patient
              </div>
            </div>

            <div class="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
              <div class="flex items-center text-muted-foreground">
                <Mail class="h-4 w-4 mr-2 text-blue-500" />
                <span>{{ patient.email }}</span>
              </div>
              <div class="flex items-center text-muted-foreground">
                <Calendar class="h-4 w-4 mr-2 text-green-500" />
                <span
                  >Last Visit: {{ formatDate(patient.lastAppointment) }}</span
                >
              </div>
              <div class="flex items-center text-muted-foreground">
                <UserCheck class="h-4 w-4 mr-2 text-purple-500" />
                <span>{{ patient.appointmentCount }} Total Visits</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Stats Overview -->
      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        <Card class="bg-gradient-to-r from-blue-50 to-blue-100 border-blue-200">
          <CardContent class="p-4">
            <div class="flex items-center justify-between">
              <div>
                <p class="text-sm font-medium text-blue-600">
                  Total Appointments
                </p>
                <p class="text-2xl font-bold text-blue-800">
                  {{ patient.appointmentCount }}
                </p>
              </div>
              <Calendar class="h-8 w-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>

        <Card
          class="bg-gradient-to-r from-purple-50 to-purple-100 border-purple-200"
        >
          <CardContent class="p-4">
            <div class="flex items-center justify-between">
              <div>
                <p class="text-sm font-medium text-purple-600">Sick Notes</p>
                <p class="text-2xl font-bold text-purple-800">
                  {{ sickNotesCount }}
                </p>
              </div>
              <FileText class="h-8 w-8 text-purple-600" />
            </div>
          </CardContent>
        </Card>

        <Card
          class="bg-gradient-to-r from-green-50 to-green-100 border-green-200"
        >
          <CardContent class="p-4">
            <div class="flex items-center justify-between">
              <div>
                <p class="text-sm font-medium text-green-600">Documents</p>
                <p class="text-2xl font-bold text-green-800">
                  {{ documentsCount }}
                </p>
              </div>
              <FileText class="h-8 w-8 text-green-600" />
            </div>
          </CardContent>
        </Card>

        <Card
          class="bg-gradient-to-r from-orange-50 to-orange-100 border-orange-200"
        >
          <CardContent class="p-4">
            <div class="flex items-center justify-between">
              <div>
                <p class="text-sm font-medium text-orange-600">Prescriptions</p>
                <p class="text-2xl font-bold text-orange-800">
                  {{ prescriptionsCount }}
                </p>
              </div>
              <Pill class="h-8 w-8 text-orange-600" />
            </div>
          </CardContent>
        </Card>

        <Card
          class="bg-gradient-to-r from-indigo-50 to-indigo-100 border-indigo-200"
        >
          <CardContent class="p-4">
            <div class="flex items-center justify-between">
              <div>
                <p class="text-sm font-medium text-indigo-600">Appointments</p>
                <p class="text-2xl font-bold text-indigo-800">
                  {{ appointmentsCount }}
                </p>
              </div>
              <Calendar class="h-8 w-8 text-indigo-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      <!-- Tabs Navigation -->
      <div class="bg-card rounded-lg border border-border">
        <div class="border-b border-border">
          <nav class="flex space-x-8 px-6" aria-label="Tabs">
            <button
              v-for="tab in tabs"
              :key="tab.id"
              @click="activeTab = tab.id"
              :class="[
                'py-4 px-1 border-b-2 font-medium text-sm whitespace-nowrap',
                activeTab === tab.id
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-muted-foreground hover:text-foreground hover:border-border',
              ]"
            >
              <component :is="tab.icon" class="h-4 w-4 mr-2 inline-block" />
              {{ tab.name }}
              <span
                v-if="tab.count !== undefined"
                :class="[
                  'ml-2 px-2 py-1 text-xs rounded-full',
                  activeTab === tab.id
                    ? 'bg-blue-100 text-blue-600'
                    : 'bg-muted text-muted-foreground',
                ]"
              >
                {{ tab.count }}
              </span>
            </button>
          </nav>
        </div>

        <!-- Tab Content -->
        <div class="p-6">
          <!-- Documents Tab -->
          <div v-if="activeTab === 'documents'" class="space-y-4">
            <div class="flex items-center justify-between">
              <h3 class="text-lg font-semibold text-foreground">Documents</h3>
              <Button variant="outline" size="sm" @click="openDocumentModal">
                <Plus class="h-4 w-4 mr-2" />
                Add Document
              </Button>
            </div>

            <!-- Document Section Toggle -->
            <div
              class="flex items-center justify-center bg-muted rounded-lg p-1"
            >
              <button
                @click="activeDocumentSection = 'doctor-uploads'"
                :class="[
                  'flex-1 py-2 px-4 text-sm font-medium rounded-md transition-colors',
                  activeDocumentSection === 'doctor-uploads'
                    ? 'bg-background text-foreground shadow-sm'
                    : 'text-muted-foreground hover:text-foreground',
                ]"
              >
                <FileText class="h-4 w-4 mr-2 inline-block" />
                Doctor Uploads
                <span
                  class="ml-2 px-2 py-1 text-xs bg-blue-100 text-blue-600 rounded-full"
                >
                  {{ totalDoctorDocuments }}
                </span>
              </button>
              <button
                @click="activeDocumentSection = 'patient-uploads'"
                :class="[
                  'flex-1 py-2 px-4 text-sm font-medium rounded-md transition-colors',
                  activeDocumentSection === 'patient-uploads'
                    ? 'bg-background text-foreground shadow-sm'
                    : 'text-muted-foreground hover:text-foreground',
                ]"
              >
                <User class="h-4 w-4 mr-2 inline-block" />
                Patient Uploads
                <span
                  class="ml-2 px-2 py-1 text-xs bg-green-100 text-green-600 rounded-full"
                >
                  {{ totalPatientDocuments }}
                </span>
              </button>
            </div>

            <!-- Document Subtabs -->
            <div class="border-b border-border">
              <nav class="flex space-x-8" aria-label="Document Tabs">
                <button
                  v-for="subTab in documentSubTabs"
                  :key="subTab.id"
                  @click="activeDocumentTab = subTab.id"
                  :class="[
                    'py-2 px-1 border-b-2 font-medium text-sm whitespace-nowrap',
                    activeDocumentTab === subTab.id
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-muted-foreground hover:text-foreground hover:border-border',
                  ]"
                >
                  <component
                    :is="subTab.icon"
                    class="h-4 w-4 mr-2 inline-block"
                  />
                  {{ subTab.name }}
                  <span
                    v-if="subTab.count !== undefined"
                    :class="[
                      'ml-2 px-2 py-1 text-xs rounded-full',
                      activeDocumentTab === subTab.id
                        ? 'bg-blue-100 text-blue-600'
                        : 'bg-muted text-muted-foreground',
                    ]"
                  >
                    {{ subTab.count }}
                  </span>
                </button>
              </nav>
            </div>

            <!-- Document Subtab Content -->
            <div class="mt-4">
              <!-- Medical Reports -->
              <div
                v-if="activeDocumentTab === 'medical-reports'"
                class="space-y-3"
              >
                <div
                  v-if="documentsByCategory['medical-reports']?.length > 0"
                  class="space-y-3"
                >
                  <div
                    v-for="document in documentsByCategory['medical-reports']"
                    :key="document._id"
                    class="bg-card border rounded-lg p-4 hover:bg-muted/50 transition-colors"
                  >
                    <div class="flex items-start justify-between">
                      <div class="flex-1">
                        <div class="flex items-center space-x-3 mb-2">
                          <h4 class="font-medium text-foreground">
                            {{ document.title }}
                          </h4>
                          <span
                            :class="[
                              'px-2 py-1 text-xs rounded-full',
                              document.metadata?.priority === 'urgent'
                                ? 'bg-red-100 text-red-700'
                                : document.metadata?.priority === 'high'
                                  ? 'bg-orange-100 text-orange-700'
                                  : 'bg-green-100 text-green-700',
                            ]"
                          >
                            {{ document.metadata?.priority || "normal" }}
                          </span>
                        </div>
                        <p
                          v-if="document.description"
                          class="text-sm text-muted-foreground mb-3"
                        >
                          {{ document.description }}
                        </p>
                        <div
                          class="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm"
                        >
                          <div
                            v-if="document.metadata?.reportType"
                            class="flex items-center text-muted-foreground"
                          >
                            <FileText class="h-4 w-4 mr-2" />
                            <span
                              >Type: {{ document.metadata.reportType }}</span
                            >
                          </div>
                          <div
                            v-if="
                              (document.metadata?.diagnoses &&
                                document.metadata.diagnoses.length > 0) ||
                              document.metadata?.diagnosis
                            "
                            class="flex items-start text-muted-foreground"
                          >
                            <FileText class="h-4 w-4 mr-2 mt-0.5" />
                            <div>
                              <span class="font-medium">Diagnoses:</span>
                              <div
                                v-if="
                                  document.metadata?.diagnoses &&
                                  document.metadata.diagnoses.length > 0
                                "
                                class="space-y-1"
                              >
                                <div
                                  v-for="diagnosis in document.metadata
                                    .diagnoses"
                                  :key="diagnosis"
                                  class="text-sm"
                                >
                                  {{ formatDiagnosisForDisplay(diagnosis) }}
                                </div>
                              </div>
                              <div
                                v-else-if="document.metadata?.diagnosis"
                                class="text-sm"
                              >
                                {{
                                  formatDiagnosisForDisplay(
                                    document.metadata.diagnosis
                                  )
                                }}
                              </div>
                            </div>
                          </div>
                          <div class="flex items-center text-muted-foreground">
                            <Calendar class="h-4 w-4 mr-2" />
                            <span
                              >Date:
                              {{ formatDate(document.documentDate) }}</span
                            >
                          </div>
                          <div class="flex items-center text-muted-foreground">
                            <Clock class="h-4 w-4 mr-2" />
                            <span
                              >Uploaded:
                              {{ formatDate(document.uploadedAt) }}</span
                            >
                          </div>
                        </div>
                      </div>
                      <div class="flex items-center space-x-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          @click="viewDocument(document._id)"
                        >
                          <Eye class="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          @click="downloadDocument(document._id)"
                        >
                          <Download class="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
                <div v-else class="text-center py-12">
                  <div
                    class="mx-auto w-24 h-24 bg-muted rounded-full flex items-center justify-center mb-4"
                  >
                    <FileText class="h-12 w-12 text-muted-foreground" />
                  </div>
                  <h3 class="text-lg font-medium text-foreground mb-2">
                    No medical reports yet
                  </h3>
                  <p class="text-muted-foreground">
                    Medical reports will appear here when uploaded
                  </p>
                </div>
              </div>

              <!-- Lab Results -->
              <div v-if="activeDocumentTab === 'lab-results'" class="space-y-3">
                <div
                  v-if="documentsByCategory['lab-results']?.length > 0"
                  class="space-y-3"
                >
                  <div
                    v-for="document in documentsByCategory['lab-results']"
                    :key="document._id"
                    class="bg-card border rounded-lg p-4 hover:bg-muted/50 transition-colors"
                  >
                    <div class="flex items-start justify-between">
                      <div class="flex-1">
                        <div class="flex items-center space-x-3 mb-2">
                          <h4 class="font-medium text-foreground">
                            {{ document.title }}
                          </h4>
                          <span
                            :class="[
                              'px-2 py-1 text-xs rounded-full',
                              document.metadata?.priority === 'urgent'
                                ? 'bg-red-100 text-red-700'
                                : document.metadata?.priority === 'high'
                                  ? 'bg-orange-100 text-orange-700'
                                  : 'bg-green-100 text-green-700',
                            ]"
                          >
                            {{ document.metadata?.priority || "normal" }}
                          </span>
                        </div>
                        <p
                          v-if="document.description"
                          class="text-sm text-muted-foreground mb-3"
                        >
                          {{ document.description }}
                        </p>
                        <div
                          class="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm"
                        >
                          <div
                            v-if="document.metadata?.labName"
                            class="flex items-center text-muted-foreground"
                          >
                            <FileText class="h-4 w-4 mr-2" />
                            <span>Lab: {{ document.metadata.labName }}</span>
                          </div>
                          <div
                            v-if="document.metadata?.testType"
                            class="flex items-center text-muted-foreground"
                          >
                            <FileText class="h-4 w-4 mr-2" />
                            <span>Test: {{ document.metadata.testType }}</span>
                          </div>
                          <div class="flex items-center text-muted-foreground">
                            <Calendar class="h-4 w-4 mr-2" />
                            <span
                              >Date:
                              {{ formatDate(document.documentDate) }}</span
                            >
                          </div>
                          <div class="flex items-center text-muted-foreground">
                            <Clock class="h-4 w-4 mr-2" />
                            <span
                              >Uploaded:
                              {{ formatDate(document.uploadedAt) }}</span
                            >
                          </div>
                        </div>
                      </div>
                      <div class="flex items-center space-x-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          @click="viewDocument(document._id)"
                        >
                          <Eye class="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          @click="downloadDocument(document._id)"
                        >
                          <Download class="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
                <div v-else class="text-center py-12">
                  <div
                    class="mx-auto w-24 h-24 bg-muted rounded-full flex items-center justify-center mb-4"
                  >
                    <FileText class="h-12 w-12 text-muted-foreground" />
                  </div>
                  <h3 class="text-lg font-medium text-foreground mb-2">
                    No lab results yet
                  </h3>
                  <p class="text-muted-foreground">
                    Lab results will appear here when uploaded
                  </p>
                </div>
              </div>

              <!-- Radiology Reports -->
              <div
                v-if="activeDocumentTab === 'radiology-reports'"
                class="space-y-3"
              >
                <div
                  v-if="documentsByCategory['radiology-reports']?.length > 0"
                  class="space-y-3"
                >
                  <div
                    v-for="document in documentsByCategory['radiology-reports']"
                    :key="document._id"
                    class="bg-card border rounded-lg p-4 hover:bg-muted/50 transition-colors"
                  >
                    <div class="flex items-start justify-between">
                      <div class="flex-1">
                        <div class="flex items-center space-x-3 mb-2">
                          <h4 class="font-medium text-foreground">
                            {{ document.title }}
                          </h4>
                          <span
                            :class="[
                              'px-2 py-1 text-xs rounded-full',
                              document.metadata?.priority === 'urgent'
                                ? 'bg-red-100 text-red-700'
                                : document.metadata?.priority === 'high'
                                  ? 'bg-orange-100 text-orange-700'
                                  : 'bg-green-100 text-green-700',
                            ]"
                          >
                            {{ document.metadata?.priority || "normal" }}
                          </span>
                        </div>
                        <p
                          v-if="document.description"
                          class="text-sm text-muted-foreground mb-3"
                        >
                          {{ document.description }}
                        </p>
                        <div
                          class="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm"
                        >
                          <div
                            v-if="document.metadata?.radiologyCenter"
                            class="flex items-center text-muted-foreground"
                          >
                            <FileText class="h-4 w-4 mr-2" />
                            <span
                              >Center:
                              {{ document.metadata.radiologyCenter }}</span
                            >
                          </div>
                          <div
                            v-if="document.metadata?.examType"
                            class="flex items-center text-muted-foreground"
                          >
                            <FileText class="h-4 w-4 mr-2" />
                            <span>Exam: {{ document.metadata.examType }}</span>
                          </div>
                          <div class="flex items-center text-muted-foreground">
                            <Calendar class="h-4 w-4 mr-2" />
                            <span
                              >Date:
                              {{ formatDate(document.documentDate) }}</span
                            >
                          </div>
                          <div class="flex items-center text-muted-foreground">
                            <Clock class="h-4 w-4 mr-2" />
                            <span
                              >Uploaded:
                              {{ formatDate(document.uploadedAt) }}</span
                            >
                          </div>
                        </div>
                      </div>
                      <div class="flex items-center space-x-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          @click="viewDocument(document._id)"
                        >
                          <Eye class="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          @click="downloadDocument(document._id)"
                        >
                          <Download class="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
                <div v-else class="text-center py-12">
                  <div
                    class="mx-auto w-24 h-24 bg-muted rounded-full flex items-center justify-center mb-4"
                  >
                    <FileText class="h-12 w-12 text-muted-foreground" />
                  </div>
                  <h3 class="text-lg font-medium text-foreground mb-2">
                    No radiology reports yet
                  </h3>
                  <p class="text-muted-foreground">
                    Radiology reports will appear here when uploaded
                  </p>
                </div>
              </div>

              <!-- Insurance Documents -->
              <div
                v-if="activeDocumentTab === 'insurance-documents'"
                class="space-y-3"
              >
                <div
                  v-if="documentsByCategory['insurance-documents']?.length > 0"
                  class="space-y-3"
                >
                  <div
                    v-for="document in documentsByCategory[
                      'insurance-documents'
                    ]"
                    :key="document._id"
                    class="bg-card border rounded-lg p-4 hover:bg-muted/50 transition-colors"
                  >
                    <div class="flex items-start justify-between">
                      <div class="flex-1">
                        <div class="flex items-center space-x-3 mb-2">
                          <h4 class="font-medium text-foreground">
                            {{ document.title }}
                          </h4>
                          <span
                            :class="[
                              'px-2 py-1 text-xs rounded-full',
                              document.metadata?.priority === 'urgent'
                                ? 'bg-red-100 text-red-700'
                                : document.metadata?.priority === 'high'
                                  ? 'bg-orange-100 text-orange-700'
                                  : 'bg-green-100 text-green-700',
                            ]"
                          >
                            {{ document.metadata?.priority || "normal" }}
                          </span>
                        </div>
                        <p
                          v-if="document.description"
                          class="text-sm text-muted-foreground mb-3"
                        >
                          {{ document.description }}
                        </p>
                        <div
                          class="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm"
                        >
                          <div
                            v-if="document.metadata?.insuranceProvider"
                            class="flex items-center text-muted-foreground"
                          >
                            <FileText class="h-4 w-4 mr-2" />
                            <span
                              >Provider:
                              {{ document.metadata.insuranceProvider }}</span
                            >
                          </div>
                          <div
                            v-if="document.metadata?.claimNumber"
                            class="flex items-center text-muted-foreground"
                          >
                            <FileText class="h-4 w-4 mr-2" />
                            <span
                              >Claim: {{ document.metadata.claimNumber }}</span
                            >
                          </div>
                          <div class="flex items-center text-muted-foreground">
                            <Calendar class="h-4 w-4 mr-2" />
                            <span
                              >Date:
                              {{ formatDate(document.documentDate) }}</span
                            >
                          </div>
                          <div class="flex items-center text-muted-foreground">
                            <Clock class="h-4 w-4 mr-2" />
                            <span
                              >Uploaded:
                              {{ formatDate(document.uploadedAt) }}</span
                            >
                          </div>
                        </div>
                      </div>
                      <div class="flex items-center space-x-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          @click="viewDocument(document._id)"
                        >
                          <Eye class="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          @click="downloadDocument(document._id)"
                        >
                          <Download class="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
                <div v-else class="text-center py-12">
                  <div
                    class="mx-auto w-24 h-24 bg-muted rounded-full flex items-center justify-center mb-4"
                  >
                    <FileText class="h-12 w-12 text-muted-foreground" />
                  </div>
                  <h3 class="text-lg font-medium text-foreground mb-2">
                    No insurance documents yet
                  </h3>
                  <p class="text-muted-foreground">
                    Insurance documents will appear here when uploaded
                  </p>
                </div>
              </div>
            </div>
          </div>

          <!-- Sick Notes Tab -->
          <div v-if="activeTab === 'sick-notes'" class="space-y-4">
            <div class="flex items-center justify-between">
              <h3 class="text-lg font-semibold text-foreground">Sick Notes</h3>
              <Button @click="openSickNoteModal" variant="outline" size="sm">
                <Plus class="h-4 w-4 mr-2" />
                Issue Sick Note
              </Button>
            </div>

            <!-- Sick Notes List -->
            <div v-if="sickNotes.length > 0" class="space-y-3">
              <div
                v-for="sickNote in sickNotes"
                :key="sickNote._id"
                class="bg-card border rounded-lg p-4 hover:bg-muted/50 transition-colors"
              >
                <div class="flex items-start justify-between">
                  <div class="flex-1">
                    <div class="flex items-center space-x-3 mb-2">
                      <h4 class="font-medium text-foreground">
                        {{ sickNote.title }}
                      </h4>
                      <span
                        :class="[
                          'px-2 py-1 text-xs rounded-full',
                          sickNote.status === 'active'
                            ? 'bg-green-100 text-green-700'
                            : sickNote.status === 'expired'
                              ? 'bg-red-100 text-red-700'
                              : 'bg-gray-100 text-gray-700',
                        ]"
                      >
                        {{ sickNote.status }}
                      </span>
                    </div>

                    <p class="text-sm text-muted-foreground mb-3">
                      {{ sickNote.description }}
                    </p>

                    <div class="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                      <div class="flex items-center text-muted-foreground">
                        <Calendar class="h-4 w-4 mr-2" />
                        <span
                          >Valid from:
                          {{ formatDate(sickNote.validFrom) }}</span
                        >
                      </div>
                      <div class="flex items-center text-muted-foreground">
                        <Calendar class="h-4 w-4 mr-2" />
                        <span
                          >Valid until:
                          {{ formatDate(sickNote.validUntil) }}</span
                        >
                      </div>
                      <div class="flex items-start text-muted-foreground">
                        <FileText class="h-4 w-4 mr-2 mt-0.5" />
                        <div>
                          <span class="font-medium">Diagnoses:</span>
                          <div
                            v-if="
                              sickNote.diagnoses &&
                              sickNote.diagnoses.length > 0
                            "
                            class="space-y-1"
                          >
                            <div
                              v-for="diagnosis in sickNote.diagnoses"
                              :key="diagnosis"
                              class="text-sm"
                            >
                              {{ formatDiagnosisForDisplay(diagnosis) }}
                            </div>
                          </div>
                          <div v-else-if="sickNote.diagnosis" class="text-sm">
                            {{ formatDiagnosisForDisplay(sickNote.diagnosis) }}
                          </div>
                          <div
                            v-else
                            class="text-sm text-muted-foreground italic"
                          >
                            No diagnoses recorded
                          </div>
                        </div>
                      </div>
                      <div class="flex items-center text-muted-foreground">
                        <Clock class="h-4 w-4 mr-2" />
                        <span
                          >Issued: {{ formatDate(sickNote.createdAt) }}</span
                        >
                      </div>
                    </div>
                  </div>

                  <div class="flex items-center space-x-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      @click="viewSickNote(sickNote._id)"
                    >
                      <Eye class="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      @click="downloadSickNote(sickNote._id)"
                    >
                      <Download class="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>
            </div>

            <!-- Empty State -->
            <div v-else class="text-center py-12">
              <div
                class="mx-auto w-24 h-24 bg-muted rounded-full flex items-center justify-center mb-4"
              >
                <ClipboardList class="h-12 w-12 text-muted-foreground" />
              </div>
              <h3 class="text-lg font-medium text-foreground mb-2">
                No sick notes yet
              </h3>
              <p class="text-muted-foreground mb-4">
                Issue sick notes for this patient when needed
              </p>
              <Button @click="openSickNoteModal" variant="outline">
                <Plus class="h-4 w-4 mr-2" />
                Issue First Sick Note
              </Button>
            </div>
          </div>

          <!-- Prescriptions Tab -->
          <div v-if="activeTab === 'prescriptions'" class="space-y-4">
            <div class="flex items-center justify-between">
              <h3 class="text-lg font-semibold text-foreground">
                Prescriptions
              </h3>
              <Button
                variant="outline"
                size="sm"
                @click="openPrescriptionModal"
              >
                <Plus class="h-4 w-4 mr-2" />
                Add Prescription
              </Button>
            </div>

            <!-- Prescriptions List -->
            <div v-if="prescriptions.length > 0" class="space-y-3">
              <div
                v-for="prescription in prescriptions"
                :key="prescription._id"
                class="bg-card border rounded-lg p-4 hover:bg-muted/50 transition-colors"
              >
                <div class="flex items-start justify-between">
                  <div class="flex-1">
                    <div class="flex items-center space-x-3 mb-2">
                      <h4 class="font-medium text-foreground">
                        {{ prescription.title }}
                      </h4>
                      <span
                        :class="[
                          'px-2 py-1 text-xs rounded-full',
                          prescription.status === 'active'
                            ? 'bg-green-100 text-green-700'
                            : prescription.status === 'expired'
                              ? 'bg-red-100 text-red-700'
                              : prescription.status === 'cancelled'
                                ? 'bg-gray-100 text-gray-700'
                                : 'bg-blue-100 text-blue-700',
                        ]"
                      >
                        {{ prescription.status }}
                      </span>
                    </div>

                    <div class="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                      <div class="flex items-center text-muted-foreground">
                        <Calendar class="h-4 w-4 mr-2" />
                        <span>{{
                          formatDate(prescription.prescriptionDate)
                        }}</span>
                      </div>
                      <div class="flex items-center text-muted-foreground">
                        <Clock class="h-4 w-4 mr-2" />
                        <span
                          >Valid until
                          {{ formatDate(prescription.validUntil) }}</span
                        >
                      </div>
                    </div>

                    <div
                      v-if="prescription.medications.length > 0"
                      class="mt-3"
                    >
                      <p class="text-sm font-medium text-foreground mb-1">
                        Medications:
                      </p>
                      <div class="flex flex-wrap gap-2">
                        <span
                          v-for="medication in prescription.medications"
                          :key="medication.name"
                          class="px-2 py-1 bg-blue-50 text-blue-700 text-xs rounded-full cursor-pointer hover:bg-blue-100 transition-colors"
                          @click="openMedicationDialog(medication)"
                        >
                          {{ medication.name }} {{ medication.dosage }}
                        </span>
                      </div>
                    </div>

                    <div
                      v-if="
                        (prescription.diagnoses &&
                          prescription.diagnoses.length > 0) ||
                        prescription.diagnosis
                      "
                      class="mt-2"
                    >
                      <div class="text-sm text-muted-foreground">
                        <strong>Diagnoses:</strong>
                        <div
                          v-if="
                            prescription.diagnoses &&
                            prescription.diagnoses.length > 0
                          "
                          class="space-y-1 mt-1"
                        >
                          <div
                            v-for="diagnosis in prescription.diagnoses"
                            :key="diagnosis"
                            class="text-sm bg-blue-50 text-blue-800 px-2 py-1 rounded border-l-3 border-blue-500"
                          >
                            {{ formatDiagnosisForDisplay(diagnosis) }}
                          </div>
                        </div>
                        <div v-else-if="prescription.diagnosis" class="mt-1">
                          <div
                            class="text-sm bg-blue-50 text-blue-800 px-2 py-1 rounded border-l-3 border-blue-500"
                          >
                            {{
                              formatDiagnosisForDisplay(prescription.diagnosis)
                            }}
                          </div>
                        </div>
                      </div>
                    </div>

                    <!-- General Instructions -->
                    <div
                      v-if="prescription.generalInstructions"
                      class="mt-3 p-3 bg-gray-50 rounded-lg"
                    >
                      <p class="text-sm font-medium text-foreground mb-1">
                        General Instructions:
                      </p>
                      <p class="text-sm text-muted-foreground">
                        {{ prescription.generalInstructions }}
                      </p>
                    </div>

                    <!-- Free Prescription -->
                    <div
                      v-if="
                        prescription.isFreePresc &&
                        prescription.freePrescriptionNotes
                      "
                      class="mt-3 p-3 bg-purple-50 rounded-lg"
                    >
                      <p class="text-sm font-medium text-foreground mb-1">
                        Free Text Prescription:
                      </p>
                      <p class="text-sm text-purple-700">
                        {{ prescription.freePrescriptionNotes }}
                      </p>
                    </div>

                    <!-- Pharmacy Information -->
                    <div
                      v-if="prescription.pharmacy && prescription.pharmacy.name"
                      class="mt-3 p-3 bg-green-50 rounded-lg"
                    >
                      <p class="text-sm font-medium text-foreground mb-2">
                        Recommended Pharmacy:
                      </p>
                      <div class="space-y-1">
                        <div class="text-sm font-medium text-green-800">
                          {{ prescription.pharmacy.name }}
                        </div>
                        <div
                          v-if="prescription.pharmacy.address"
                          class="text-sm text-green-700"
                        >
                          {{ prescription.pharmacy.address }}
                        </div>
                        <div
                          v-if="prescription.pharmacy.phone"
                          class="text-sm text-green-700"
                        >
                          📞 {{ prescription.pharmacy.phone }}
                        </div>
                      </div>
                    </div>

                    <!-- Follow-up Information -->
                    <div
                      v-if="
                        prescription.followUp && prescription.followUp.required
                      "
                      class="mt-3 p-3 bg-yellow-50 rounded-lg"
                    >
                      <p class="text-sm font-medium text-foreground mb-1">
                        Follow-up Required:
                      </p>
                      <div class="space-y-1">
                        <div
                          v-if="prescription.followUp.date"
                          class="text-sm text-yellow-800"
                        >
                          📅 {{ formatDate(prescription.followUp.date) }}
                        </div>
                        <div
                          v-if="prescription.followUp.notes"
                          class="text-sm text-yellow-700"
                        >
                          {{ prescription.followUp.notes }}
                        </div>
                      </div>
                    </div>

                    <!-- Notes -->
                    <div
                      v-if="prescription.notes"
                      class="mt-3 p-3 bg-gray-50 rounded-lg"
                    >
                      <p class="text-sm font-medium text-foreground mb-1">
                        Additional Notes:
                      </p>
                      <p class="text-sm text-muted-foreground">
                        {{ prescription.notes }}
                      </p>
                    </div>
                  </div>

                  <div class="flex items-center space-x-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      @click="viewPrescription(prescription._id)"
                    >
                      <Eye class="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      @click="downloadPrescription(prescription._id)"
                    >
                      <Download class="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>
            </div>

            <!-- Empty State -->
            <div v-else class="text-center py-12">
              <div
                class="mx-auto w-24 h-24 bg-muted rounded-full flex items-center justify-center mb-4"
              >
                <Pill class="h-12 w-12 text-muted-foreground" />
              </div>
              <h3 class="text-lg font-medium text-foreground mb-2">
                No prescriptions yet
              </h3>
              <p class="text-muted-foreground mb-4">
                Prescriptions will appear here when issued
              </p>
              <Button variant="outline" @click="openPrescriptionModal">
                <Plus class="h-4 w-4 mr-2" />
                Add First Prescription
              </Button>
            </div>
          </div>

          <!-- Appointments Tab -->
          <div v-if="activeTab === 'appointments'" class="space-y-4">
            <div class="flex items-center justify-between">
              <h3 class="text-lg font-semibold text-foreground">
                Appointments
              </h3>
              <Button variant="outline" size="sm">
                <Plus class="h-4 w-4 mr-2" />
                Schedule Appointment
              </Button>
            </div>

            <!-- Appointments List -->
            <div v-if="patientAppointments.length > 0" class="space-y-3">
              <div
                v-for="appointment in patientAppointments"
                :key="appointment._id"
                class="bg-card border rounded-lg p-4 hover:bg-muted/50 transition-colors"
              >
                <div class="flex items-start justify-between">
                  <div class="flex-1">
                    <div class="flex items-center space-x-3 mb-2">
                      <h4 class="font-medium text-foreground">
                        {{ formatDate(appointment.date) }}
                      </h4>
                      <span
                        :class="[
                          'px-2 py-1 text-xs rounded-full',
                          appointment.status === 'completed'
                            ? 'bg-green-100 text-green-700'
                            : appointment.status === 'confirmed'
                              ? 'bg-blue-100 text-blue-700'
                              : appointment.status === 'cancelled'
                                ? 'bg-red-100 text-red-700'
                                : 'bg-yellow-100 text-yellow-700',
                        ]"
                      >
                        {{ appointment.status }}
                      </span>
                    </div>

                    <div class="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                      <div class="flex items-center text-muted-foreground">
                        <Calendar class="h-4 w-4 mr-2" />
                        <span>{{ formatDateTime(appointment.date) }}</span>
                      </div>
                      <div class="flex items-center text-muted-foreground">
                        <User class="h-4 w-4 mr-2" />
                        <span
                          >{{ appointment.patientId.firstName }}
                          {{ appointment.patientId.lastName }}</span
                        >
                      </div>
                    </div>
                  </div>

                  <div class="flex items-center space-x-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      @click="viewAppointment(appointment._id)"
                    >
                      <Eye class="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>
            </div>

            <!-- Empty State -->
            <div v-else class="text-center py-12">
              <div
                class="mx-auto w-24 h-24 bg-muted rounded-full flex items-center justify-center mb-4"
              >
                <Calendar class="h-12 w-12 text-muted-foreground" />
              </div>
              <h3 class="text-lg font-medium text-foreground mb-2">
                No appointments yet
              </h3>
              <p class="text-muted-foreground mb-4">
                Appointments with this patient will appear here
              </p>
              <Button variant="outline">
                <Plus class="h-4 w-4 mr-2" />
                Schedule First Appointment
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Sick Note Upload Modal -->
    <SickNoteUploadModal
      v-model:open="showSickNoteModal"
      :patient-id="patient?._id || ''"
      :patient-name="patient ? `${patient.firstName} ${patient.lastName}` : ''"
      @success="handleSickNoteSuccess"
    />

    <!-- Prescription Upload Modal -->
    <PrescriptionUploadModal
      v-if="showPrescriptionModal"
      :patient-id="patient?._id || ''"
      @close="showPrescriptionModal = false"
      @success="handlePrescriptionSuccess"
    />

    <!-- Document Upload Modal -->
    <DocumentUploadModal
      v-if="showDocumentModal"
      :patient-id="patient?._id || ''"
      @close="showDocumentModal = false"
      @document-uploaded="handleDocumentSuccess"
    />

    <!-- Medication Details Dialog -->
    <div
      v-if="showMedicationDialog"
      class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
    >
      <div
        class="bg-white rounded-lg shadow-xl w-full max-w-md mx-4 p-6 relative"
      >
        <button
          @click="closeMedicationDialog"
          class="absolute top-4 right-4 text-gray-400 hover:text-gray-600"
        >
          <span class="sr-only">Close</span>
          <svg
            class="h-6 w-6"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M6 18L18 6M6 6l12 12"
            />
          </svg>
        </button>

        <div class="mb-6">
          <h2 class="text-xl font-semibold text-gray-900 mb-2">
            Medication Details
          </h2>
          <div class="h-px bg-gray-200"></div>
        </div>

        <div v-if="selectedMedication" class="space-y-4">
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">
              Medication Name
            </label>
            <p class="text-sm text-gray-900 bg-gray-50 px-3 py-2 rounded">
              {{ selectedMedication.name }}
            </p>
          </div>

          <div class="grid grid-cols-2 gap-4">
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">
                Dosage
              </label>
              <p class="text-sm text-gray-900 bg-gray-50 px-3 py-2 rounded">
                {{ selectedMedication.dosage }}
              </p>
            </div>
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">
                Frequency
              </label>
              <p class="text-sm text-gray-900 bg-gray-50 px-3 py-2 rounded">
                {{ selectedMedication.frequency }}
              </p>
            </div>
          </div>

          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">
              Duration
            </label>
            <p class="text-sm text-gray-900 bg-gray-50 px-3 py-2 rounded">
              {{ selectedMedication.duration }}
            </p>
          </div>

          <div v-if="selectedMedication.instructions">
            <label class="block text-sm font-medium text-gray-700 mb-1">
              Instructions
            </label>
            <p class="text-sm text-gray-900 bg-gray-50 px-3 py-2 rounded">
              {{ selectedMedication.instructions }}
            </p>
          </div>
        </div>

        <div class="mt-6 flex justify-end">
          <Button @click="closeMedicationDialog" variant="outline" size="sm">
            Close
          </Button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch } from "vue";
import { useRoute, useRouter } from "vue-router";
import { useApi } from "@/composables/useApi";
import { useDoctorAuth } from "@/composables/useDoctorAuth";

// UI Components
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import SickNoteUploadModal from "@/components/SickNoteUploadModal.vue";
import PrescriptionUploadModal from "@/components/PrescriptionUploadModal.vue";
import DocumentUploadModal from "@/components/DocumentUploadModal.vue";

// Icons
import {
  ArrowLeft,
  RefreshCw,
  Loader2,
  AlertTriangle,
  User,
  Mail,
  Calendar,
  UserCheck,
  FileText,
  ClipboardList,
  Pill,
  Plus,
  Eye,
  Download,
  Clock,
} from "lucide-vue-next";
import type { LucideIcon } from "lucide-vue-next";

import { cn } from "@/lib/utils";
import { formatDiagnosisForDisplay } from "@/utils/icd10Utils";

// Types
interface Patient {
  _id: string;
  firstName: string;
  lastName: string;
  email: string;
  appointmentCount: number;
  lastAppointment: string;
  firstAppointment: string;
}

interface SickNote {
  _id: string;
  title: string;
  description: string;
  diagnosis?: string;
  diagnoses?: string[];
  validFrom: string;
  validUntil: string;
  status: "active" | "expired" | "cancelled";
  restrictions?: string;
  createdAt: string;
  pdfUrl: string;
}

interface Prescription {
  _id: string;
  title: string;
  medications: Array<{
    name: string;
    dosage: string;
    frequency: string;
    duration: string;
    instructions?: string;
  }>;
  diagnosis?: string;
  diagnoses?: string[];
  generalInstructions?: string;
  prescriptionDate: string;
  validUntil: string;
  status: "active" | "expired" | "cancelled" | "completed";
  notes?: string;
  createdAt: string;
  pdfUrl: string;
  isFreePresc?: boolean;
  freePrescriptionNotes?: string;
  pharmacy?: {
    name?: string;
    address?: string;
    phone?: string;
  };
  followUp?: {
    required?: boolean;
    date?: string;
    notes?: string;
  };
}

interface Document {
  _id: string;
  title: string;
  description?: string;
  category:
    | "medical-reports"
    | "lab-results"
    | "radiology-reports"
    | "insurance-documents";
  filename: string;
  originalFilename: string;
  fileSize: number;
  contentType: string;
  documentDate: string;
  uploadedAt: string;
  status: "active" | "archived" | "deleted";
  metadata?: {
    // Common fields
    referenceNumber?: string;
    priority?: "low" | "normal" | "high" | "urgent";
    notes?: string;
    // Medical reports
    reportType?: string;
    diagnosis?: string;
    diagnoses?: string[];
    // Lab results
    labName?: string;
    testType?: string;
    // Radiology reports
    radiologyCenter?: string;
    examType?: string;
    // Insurance documents
    insuranceProvider?: string;
    claimNumber?: string;
  };
}

interface Tab {
  id: string;
  name: string;
  icon: LucideIcon;
  count?: number;
}

interface Appointment {
  _id: string;
  patientId: {
    _id: string;
    firstName: string;
    lastName: string;
    email: string;
  };
  date: string;
  status: string;
}

// Composables
const route = useRoute();
const router = useRouter();
const { appointments: appointmentsApi } = useApi();
const { makeAuthenticatedRequest } = useDoctorAuth();

// State
const patient = ref<Patient | null>(null);
const sickNotes = ref<SickNote[]>([]);
const prescriptions = ref<Prescription[]>([]);
const documents = ref<Document[]>([]);
const patientDocuments = ref<Document[]>([]);
const patientAppointments = ref<Appointment[]>([]);
const isLoading = ref(false);
const error = ref<string | null>(null);
const activeTab = ref("documents");
const activeDocumentTab = ref("medical-reports");
const activeDocumentSection = ref<"doctor-uploads" | "patient-uploads">(
  "doctor-uploads"
);
const showSickNoteModal = ref(false);
const showPrescriptionModal = ref(false);
const showDocumentModal = ref(false);
const showMedicationDialog = ref(false);
const selectedMedication = ref<{
  name: string;
  dosage: string;
  frequency: string;
  duration: string;
  instructions?: string;
} | null>(null);

// Get tab from query params
watch(
  () => route.query.tab,
  (newTab) => {
    if (newTab && typeof newTab === "string") {
      activeTab.value = newTab;
    }
  },
  { immediate: true }
);

// Computed properties
const sickNotesCount = computed(() => sickNotes.value.length);
const documentsCount = computed(() => documents.value.length);
const prescriptionsCount = computed(() => prescriptions.value.length);
const appointmentsCount = computed(() => patientAppointments.value.length);

// Document-related computed properties
const documentsByCategory = computed(() => {
  const sourceDocuments =
    activeDocumentSection.value === "doctor-uploads"
      ? documents.value
      : patientDocuments.value;

  const categories = {
    "medical-reports": sourceDocuments.filter(
      (doc) => doc.category === "medical-reports"
    ),
    "lab-results": sourceDocuments.filter(
      (doc) => doc.category === "lab-results"
    ),
    "radiology-reports": sourceDocuments.filter(
      (doc) => doc.category === "radiology-reports"
    ),
    "insurance-documents": sourceDocuments.filter(
      (doc) => doc.category === "insurance-documents"
    ),
  };
  return categories;
});

const totalDoctorDocuments = computed(() => documents.value.length);
const totalPatientDocuments = computed(() => patientDocuments.value.length);

const documentSubTabs = computed(() => [
  {
    id: "medical-reports",
    name: "Medical Reports",
    icon: FileText,
    count: documentsByCategory.value["medical-reports"].length,
  },
  {
    id: "lab-results",
    name: "Lab Results",
    icon: FileText,
    count: documentsByCategory.value["lab-results"].length,
  },
  {
    id: "radiology-reports",
    name: "Radiology Reports",
    icon: FileText,
    count: documentsByCategory.value["radiology-reports"].length,
  },
  {
    id: "insurance-documents",
    name: "Insurance Documents",
    icon: FileText,
    count: documentsByCategory.value["insurance-documents"].length,
  },
]);

const tabs = computed((): Tab[] => [
  {
    id: "documents",
    name: "Documents",
    icon: FileText,
    count: documentsCount.value,
  },
  {
    id: "sick-notes",
    name: "Sick Notes",
    icon: ClipboardList,
    count: sickNotesCount.value,
  },
  {
    id: "prescriptions",
    name: "Prescriptions",
    icon: Pill,
    count: prescriptionsCount.value,
  },
  {
    id: "appointments",
    name: "Appointments",
    icon: Calendar,
    count: appointmentsCount.value,
  },
]);

// Methods
const fetchPatient = async () => {
  try {
    isLoading.value = true;
    error.value = null;

    const patientId = route.params.id as string;

    // Fetch all appointments for this doctor
    const response = await appointmentsApi.getAll();
    const appointments = (response.data || response) as Appointment[];

    // Find the patient from appointments
    const foundPatient = appointments.find(
      (apt: Appointment) => apt.patientId._id === patientId
    )?.patientId;

    if (!foundPatient) {
      error.value = "Patient not found";
      return;
    }

    // Calculate patient stats
    const patientAppointmentsData = appointments.filter(
      (apt: Appointment) => apt.patientId._id === patientId
    );

    // Store patient appointments in state
    patientAppointments.value = patientAppointmentsData;

    patient.value = {
      _id: foundPatient._id,
      firstName: foundPatient.firstName,
      lastName: foundPatient.lastName,
      email: foundPatient.email,
      appointmentCount: patientAppointmentsData.length,
      lastAppointment:
        patientAppointmentsData.sort(
          (a: Appointment, b: Appointment) =>
            new Date(b.date).getTime() - new Date(a.date).getTime()
        )[0]?.date || "",
      firstAppointment:
        patientAppointmentsData.sort(
          (a: Appointment, b: Appointment) =>
            new Date(a.date).getTime() - new Date(b.date).getTime()
        )[0]?.date || "",
    };

    // Fetch sick notes for this patient
    await fetchSickNotes();

    // Fetch prescriptions for this patient
    await fetchPrescriptions();

    // Fetch documents for this patient
    await fetchDocuments();

    // Fetch patient uploads
    await fetchPatientDocuments();
  } catch (err) {
    console.error("Failed to fetch patient:", err);
    error.value = "Failed to load patient details. Please try again.";
  } finally {
    isLoading.value = false;
  }
};

const fetchSickNotes = async () => {
  try {
    const patientId = route.params.id as string;
    const data = await makeAuthenticatedRequest(
      `/api/sick-notes/doctor?patientId=${patientId}`
    );

    if (data.success) {
      sickNotes.value = data.data || [];
    }
  } catch (err) {
    console.error("Failed to fetch sick notes:", err);
  }
};

const fetchPrescriptions = async () => {
  try {
    const patientId = route.params.id as string;
    const data = await makeAuthenticatedRequest(
      `/api/prescriptions/doctor?patientId=${patientId}`
    );

    if (data.success) {
      prescriptions.value = data.data || [];
    }
  } catch (err) {
    console.error("Failed to fetch prescriptions:", err);
  }
};

const refreshPatient = () => {
  fetchPatient();
};

const goBack = () => {
  router.push("/patients");
};

const formatDate = (dateString: string) => {
  return new Date(dateString).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
};

const formatDateTime = (dateString: string) => {
  return new Date(dateString).toLocaleString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

// Appointment Methods
const viewAppointment = (appointmentId: string) => {
  // Navigate to appointment detail or open modal
  console.log("View appointment:", appointmentId);
  // This could navigate to meeting page or show appointment details
  router.push(`/meeting/${appointmentId}`);
};

// Sick Note Methods
const openSickNoteModal = () => {
  showSickNoteModal.value = true;
};

const handleSickNoteSuccess = () => {
  showSickNoteModal.value = false;
  fetchSickNotes(); // Refresh sick notes list
};

const viewSickNote = async (sickNoteId: string) => {
  try {
    // Get presigned URL for secure access
    const response = await makeAuthenticatedRequest(
      `/api/sick-notes/${sickNoteId}/pdf`
    );

    if (response.success && response.presignedUrl) {
      // Open PDF in new tab using the secure presigned URL
      window.open(response.presignedUrl, "_blank");
    } else {
      console.error("Failed to get secure access URL");
    }
  } catch (error) {
    console.error("Error viewing sick note:", error);
    // Fallback: try direct URL if presigned URL fails
    const sickNote = sickNotes.value.find((note) => note._id === sickNoteId);
    if (sickNote && sickNote.pdfUrl) {
      window.open(sickNote.pdfUrl, "_blank");
    }
  }
};

const downloadSickNote = async (sickNoteId: string) => {
  try {
    // Find the sick note for filename
    const sickNote = sickNotes.value.find((note) => note._id === sickNoteId);

    if (!sickNote) {
      console.error("Sick note not found");
      return;
    }

    // Get presigned URL for secure download
    const response = await makeAuthenticatedRequest(
      `/api/sick-notes/${sickNoteId}/pdf`
    );

    if (response.success && response.presignedUrl) {
      // Download PDF using the secure presigned URL
      const link = document.createElement("a");
      link.href = response.presignedUrl;
      link.download = `sick-note-${sickNote.title.replace(/[^a-zA-Z0-9]/g, "-")}.pdf`;
      link.target = "_blank";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } else {
      console.error("Failed to get secure download URL");
      // Fallback: try direct URL
      if (sickNote.pdfUrl) {
        const link = document.createElement("a");
        link.href = sickNote.pdfUrl;
        link.download = `sick-note-${sickNote.title.replace(/[^a-zA-Z0-9]/g, "-")}.pdf`;
        link.target = "_blank";
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      }
    }
  } catch (error) {
    console.error("Error downloading sick note:", error);
  }
};

// Prescription Methods
const openPrescriptionModal = () => {
  showPrescriptionModal.value = true;
};

const handlePrescriptionSuccess = () => {
  showPrescriptionModal.value = false;
  fetchPrescriptions(); // Refresh prescriptions list
};

const viewPrescription = async (prescriptionId: string) => {
  try {
    // Get presigned URL for secure access
    const response = await makeAuthenticatedRequest(
      `/api/prescriptions/${prescriptionId}/pdf`
    );

    if (response.success && response.presignedUrl) {
      // Open PDF in new tab using the secure presigned URL
      window.open(response.presignedUrl, "_blank");
    } else {
      console.error("Failed to get secure access URL");
    }
  } catch (error) {
    console.error("Error viewing prescription:", error);
    // Fallback: try direct URL if presigned URL fails
    const prescription = prescriptions.value.find(
      (p) => p._id === prescriptionId
    );
    if (prescription && prescription.pdfUrl) {
      window.open(prescription.pdfUrl, "_blank");
    }
  }
};

const downloadPrescription = async (prescriptionId: string) => {
  try {
    // Find the prescription for filename
    const prescription = prescriptions.value.find(
      (p) => p._id === prescriptionId
    );

    if (!prescription) {
      console.error("Prescription not found");
      return;
    }

    // Get presigned URL for secure download
    const response = await makeAuthenticatedRequest(
      `/api/prescriptions/${prescriptionId}/pdf`
    );

    if (response.success && response.presignedUrl) {
      // Download PDF using the secure presigned URL
      const link = document.createElement("a");
      link.href = response.presignedUrl;
      link.download = `prescription-${prescription.title.replace(/[^a-zA-Z0-9]/g, "-")}.pdf`;
      link.target = "_blank";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } else {
      console.error("Failed to get secure download URL");
      // Fallback: try direct URL
      if (prescription.pdfUrl) {
        const link = document.createElement("a");
        link.href = prescription.pdfUrl;
        link.download = `prescription-${prescription.title.replace(/[^a-zA-Z0-9]/g, "-")}.pdf`;
        link.target = "_blank";
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      }
    }
  } catch (error) {
    console.error("Error downloading prescription:", error);
  }
};

// Document Methods
const fetchDocuments = async () => {
  try {
    const patientId = route.params.id as string;
    const data = await makeAuthenticatedRequest(
      `/api/documents/patient/${patientId}`
    );

    if (data.success) {
      documents.value = data.data?.documents || [];
    }
  } catch (err) {
    console.error("Failed to fetch documents:", err);
  }
};

const fetchPatientDocuments = async () => {
  try {
    const patientId = route.params.id as string;
    const data = await makeAuthenticatedRequest(
      `/api/documents/patient/${patientId}/uploads`
    );

    if (data.success) {
      patientDocuments.value = data.data?.documents || [];
    }
  } catch (err) {
    console.error("Failed to fetch patient documents:", err);
  }
};

const openDocumentModal = () => {
  showDocumentModal.value = true;
};

const handleDocumentSuccess = () => {
  showDocumentModal.value = false;
  fetchDocuments(); // Refresh doctor documents list
  fetchPatientDocuments(); // Refresh patient documents list
};

const viewDocument = async (documentId: string) => {
  try {
    // Get presigned URL for secure access
    const response = await makeAuthenticatedRequest(
      `/api/documents/doctor/${documentId}`
    );

    if (response.success && response.data?.presignedUrl) {
      // Open document in new tab using the secure presigned URL
      window.open(response.data.presignedUrl, "_blank");
    } else {
      console.error("Failed to get secure access URL");
    }
  } catch (error) {
    console.error("Error viewing document:", error);
  }
};

const downloadDocument = async (documentId: string) => {
  try {
    // Find the document for filename
    const doc = documents.value.find((doc) => doc._id === documentId);

    if (!doc) {
      console.error("Document not found");
      return;
    }

    // Get presigned URL for secure download
    const response = await makeAuthenticatedRequest(
      `/api/documents/doctor/${documentId}`
    );

    if (response.success && response.data?.presignedUrl) {
      // Download document using the secure presigned URL
      const link = document.createElement("a");
      link.href = response.data.presignedUrl;
      link.download =
        doc.originalFilename ||
        `document-${doc.title.replace(/[^a-zA-Z0-9]/g, "-")}.pdf`;
      link.target = "_blank";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } else {
      console.error("Failed to get secure download URL");
    }
  } catch (error) {
    console.error("Error downloading document:", error);
  }
};

// Medication Dialog Methods
const openMedicationDialog = (medication: {
  name: string;
  dosage: string;
  frequency: string;
  duration: string;
  instructions?: string;
}) => {
  selectedMedication.value = medication;
  showMedicationDialog.value = true;
};

const closeMedicationDialog = () => {
  showMedicationDialog.value = false;
  selectedMedication.value = null;
};

// Lifecycle
onMounted(() => {
  fetchPatient();
});
</script>
