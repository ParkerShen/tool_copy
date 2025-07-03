import { useLangStore, useUserStore } from "@/store"

interface UserPosition {
  latitude: number
  longitude: number
}

// 定义中国的经纬度范围
const chinaBounds: Record<string, number> = {
  minLatitude: 3.51, // 中国最南端的纬度（北纬）
  maxLatitude: 53.33, // 中国最北端的纬度（北纬）
  minLongitude: 73.33, // 中国最西端的经度（东经）
  maxLongitude: 135.05, // 中国最东端的经度（东经）
}

// 判断用户的经纬度是否在中国范围内
export const isUserInChina = (userPosition: UserPosition, chinaBounds: Record<string, number>) => {
  return (
    userPosition.latitude >= chinaBounds.minLatitude &&
    userPosition.latitude <= chinaBounds.maxLatitude &&
    userPosition.longitude >= chinaBounds.minLongitude &&
    userPosition.longitude <= chinaBounds.maxLongitude
  )
}

// 获取用户的位置信息
export const getH5UserPosition = () => {
  const userStore = useUserStore()
  const langStore = useLangStore()
  return new Promise((resolve, reject) => {
    // uni.getLocation({
    //   type: "wgs84",
    //   success: (res) => {
    //     resolve(res)
    //     userStore.setLatitude(res.latitude)
    //     userStore.setLongitude(res.longitude)
    //     const isInChina = isUserInChina(
    //       { latitude: res.latitude, longitude: res.longitude },
    //       chinaBounds,
    //     )
    //     if (langStore.lang) {
    //       return
    //     }
    //     if (isInChina) {
    //       langStore.setLang("zh_CN")
    //     } else {
    //       langStore.setLang("en_US")
    //     }
    //   },
    //   fail: (err) => {
    //     reject(err)
    //   },
    // })
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        function (position) {
          resolve(position.coords)
          const latitude = position.coords.latitude
          const longitude = position.coords.longitude
          userStore.setLatitude(latitude)
          userStore.setLongitude(longitude)
          const isInChina = isUserInChina({ latitude, longitude }, chinaBounds)
          console.log(`Latitude: ${latitude}, Longitude: ${longitude}`, `inChina: ${isInChina}`)
          if (langStore.lang) {
            return
          }
          if (isInChina) {
            langStore.setLang("zh_CN")
          } else {
            langStore.setLang("en_US")
          }
        },
        function (error) {
          console.error(error)
        },
      )
    } else {
      console.log("Geolocation is not supported by this browser.")
    }
  })
}
