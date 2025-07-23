/*
 * @Date: 2025-07-23 15:51:33
 * @LastEditors: parker 960822987@qq.com
 * @LastEditTime: 2025-07-23 15:51:38
 * @FilePath: \mobile\src\store\bookkeeping.ts
 */
import { defineStore } from "pinia"
import { ref } from "vue"

export const useBookkeepingStore = defineStore(
  "bookkeeping",
  () => {
    const showAddPopup = ref(false)
    const shouldShowAdd = ref(false)

    const setShowAddPopup = (val: boolean) => {
      showAddPopup.value = val
    }

    const setShouldShowAdd = (val: boolean) => {
      shouldShowAdd.value = val
    }

    const reset = () => {
      showAddPopup.value = false
      shouldShowAdd.value = false
    }

    return {
      showAddPopup,
      shouldShowAdd,
      setShowAddPopup,
      setShouldShowAdd,
      reset,
    }
  },
  {
    persist: {
      storage: localStorage,
      paths: ["shouldShowAdd"],
    },
  },
)
