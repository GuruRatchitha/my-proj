let pendingRequestCount = 0
const listeners = new Set()

const notifyListeners = () => {
  listeners.forEach((listener) => listener())
}

export const startLoading = () => {
  pendingRequestCount += 1
  notifyListeners()
}

export const stopLoading = () => {
  pendingRequestCount = Math.max(0, pendingRequestCount - 1)
  notifyListeners()
}

export const subscribeToLoading = (listener) => {
  listeners.add(listener)

  return () => {
    listeners.delete(listener)
  }
}

export const getLoadingSnapshot = () => pendingRequestCount > 0
