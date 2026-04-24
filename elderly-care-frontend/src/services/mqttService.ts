//src/services/mqttService.ts
import mqtt from "mqtt"
import type { MqttClient } from "mqtt"

export type VitalStatusHandler = (status: string) => void
export type VitalMessageHandler = (
  topic: string,
  rawMessage: string,
  timestamp: string
) => void

type VitalMqttConfig = {
  brokerUrl?: string
  topics: string[]
  onMessage?: VitalMessageHandler
  onStatusChange?: VitalStatusHandler
}

export class VitalMqttService {
  private client: MqttClient | null = null
  private topics: string[]
  // 🚨 1. ประกาศตัวแปร config แยกออกมาด้านนอก
  private config: VitalMqttConfig; 

  // 🚨 2. ปรับ Constructor ให้รับค่าแบบปกติ (ไม่มี private ข้างหน้า)
  constructor(config: VitalMqttConfig) {
    this.config = config;
    this.topics = config.topics;
  }

  connect() {
    if (this.client) return

    const brokerUrl = this.config.brokerUrl ?? "wss://broker.emqx.io:8084/mqtt"

    this.config.onStatusChange?.("connecting")

    this.client = mqtt.connect(brokerUrl, {
      reconnectPeriod: 3000,
      connectTimeout: 10000,
      clientId: `elderly_vitals_${Math.random().toString(16).slice(2, 10)}`,
      clean: true,
    })

    this.client.on("connect", () => {
      this.config.onStatusChange?.("connected")

      this.client?.subscribe(this.topics, (error) => {
        if (error) {
          this.config.onStatusChange?.("subscribe_error")
          return
        }

        this.config.onStatusChange?.(`subscribed:${this.topics.join(", ")}`)
      })
    })

    this.client.on("reconnect", () => {
      this.config.onStatusChange?.("reconnecting")
    })

    this.client.on("offline", () => {
      this.config.onStatusChange?.("offline")
    })

    this.client.on("close", () => {
      this.config.onStatusChange?.("closed")
    })

    this.client.on("error", (error) => {
      this.config.onStatusChange?.(`error:${error.message}`)
    })

    this.client.on("message", (topic, payload) => {
      const rawMessage = payload.toString().trim()
      const timestamp = new Date().toLocaleString("th-TH")

      this.config.onMessage?.(topic, rawMessage, timestamp)
    })
  }

  disconnect() {
    if (!this.client) return

    this.client.end(true)
    this.client = null
    this.config.onStatusChange?.("disconnected")
  }
}