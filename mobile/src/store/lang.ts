import { LanguageIndexVo } from "@/api/lang/types"
import { defineStore } from "pinia"
import { ref } from "vue"

export const useLangStore = defineStore(
  "lang",
  () => {
    const langList = ref<LanguageIndexVo[]>([])

    const lang = ref("")

    const langVisible = ref(false)

    const langPackageLoading = ref(true)

    const setLangList = (val: LanguageIndexVo[]) => {
      langList.value = val
    }

    const setLang = (val: string) => {
      lang.value = val
    }

    const setLangPackageLoading = (val: boolean) => {
      langPackageLoading.value = val
    }

    const setLangVisible = (val = false) => {
      langVisible.value = val
    }

    return {
      langList,
      lang,
      langPackageLoading,
      langVisible,
      setLangList,
      setLang,
      setLangPackageLoading,
      setLangVisible,
    }
  },
  {
    persist: {
      storage: localStorage,
      paths: ["lang"],
    },
  },
)
