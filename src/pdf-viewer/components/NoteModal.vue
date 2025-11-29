<template>
  <div class="note-modal show" @click="handleBackdropClick">
    <div class="note-content" @click.stop>
      <h3>Add Note</h3>
      <textarea 
        v-model="noteText"
        class="note-textarea" 
        placeholder="Enter your note here..."
        ref="textareaRef"
      ></textarea>
      <div class="modal-actions">
        <button @click="handleSave" class="btn btn-primary">Save Note</button>
        <button @click="$emit('close')" class="btn btn-secondary">Cancel</button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, nextTick } from 'vue'

// Emits
const emit = defineEmits<{
  close: []
  save: [text: string]
}>()

// Refs
const noteText = ref('')
const textareaRef = ref<HTMLTextAreaElement>()

// Methods
const handleSave = () => {
  const text = noteText.value.trim()
  if (text) {
    emit('save', text)
  }
}

const handleBackdropClick = (e: MouseEvent) => {
  if (e.target === e.currentTarget) {
    emit('close')
  }
}

// Lifecycle
onMounted(async () => {
  await nextTick()
  textareaRef.value?.focus()
})
</script>

<style scoped>
.note-modal {
  position: fixed;
  top: 0;
  left: 0;
  width: 100vw;
  height: 100vh;
  background: rgba(0, 0, 0, 0.8);
  backdrop-filter: blur(8px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 3000;
  animation: fadeIn 0.2s ease-out;
}

@keyframes fadeIn {
  from {
    opacity: 0;
  }
  to {
    opacity: 1;
  }
}

.note-modal.show {
  display: flex;
}

.note-content {
  background: linear-gradient(135deg, #1a1a1a 0%, #252525 100%);
  border-radius: 16px;
  box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.8);
  padding: 24px;
  max-width: 400px;
  width: 90%;
  color: #e0e0e0;
  border: 1px solid rgba(255, 255, 255, 0.1);
  animation: slideUp 0.3s ease-out;
}

@keyframes slideUp {
  from {
    transform: translateY(20px);
    opacity: 0;
  }
  to {
    transform: translateY(0);
    opacity: 1;
  }
}

.note-content h3 {
  margin: 0 0 20px;
  font-size: 22px;
  font-weight: 600;
  color: #ffffff;
  letter-spacing: -0.5px;
}

.note-textarea {
  width: 100%;
  min-height: 120px;
  padding: 12px 16px;
  border: 1px solid rgba(255, 255, 255, 0.15);
  border-radius: 8px;
  font-size: 14px;
  resize: vertical;
  outline: none;
  font-family: inherit;
  background: rgba(0, 0, 0, 0.3);
  color: #ffffff;
  transition: all 0.2s;
}

.note-textarea::placeholder {
  color: #6b7280;
}

.note-textarea:focus {
  border-color: #2563eb;
  background: rgba(37, 99, 235, 0.1);
  box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.2);
}

.modal-actions {
  display: flex;
  gap: 12px;
  margin-top: 24px;
}

.btn {
  flex: 1;
  padding: 10px 18px;
  border-radius: 8px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
  border: none;
  display: flex;
  align-items: center;
  justify-content: center;
  font-family: inherit;
}

.btn-primary {
  background: linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%);
  color: white;
  box-shadow: 0 2px 8px rgba(37, 99, 235, 0.3);
}

.btn-primary:hover {
  background: linear-gradient(135deg, #1d4ed8 0%, #1e40af 100%);
  box-shadow: 0 4px 12px rgba(37, 99, 235, 0.4);
  transform: translateY(-1px);
}

.btn-secondary {
  background: rgba(255, 255, 255, 0.1);
  color: #e0e0e0;
  border: 1px solid rgba(255, 255, 255, 0.15);
}

.btn-secondary:hover {
  background: rgba(255, 255, 255, 0.15);
  border-color: rgba(255, 255, 255, 0.25);
}
</style>

