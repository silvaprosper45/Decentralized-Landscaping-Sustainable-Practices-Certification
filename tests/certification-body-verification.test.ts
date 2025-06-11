import { describe, it, expect, beforeEach } from "vitest"

// Mock the Clarity environment
const mockTxSender = "ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM"
const mockOtherUser = "ST2CY5V39NHDPWSXMW9QDT3HC3GD6Q6XX4CFRK9AG"

// Mock contract state
let certificationBodies = new Map()
let admin = mockTxSender

// Mock contract functions
const contractFunctions = {
  "register-certification-body": (name, credentials) => {
    const caller = mockTxSender // Simulating tx-sender
    
    if (caller !== admin) {
      return { err: 403 }
    }
    
    certificationBodies.set(caller, {
      name,
      status: "pending",
      "registration-date": 123, // Mock block height
      credentials,
    })
    
    return { ok: true }
  },
  
  "approve-certification-body": (body) => {
    const caller = mockTxSender // Simulating tx-sender
    
    if (caller !== admin) {
      return { err: 403 }
    }
    
    if (!certificationBodies.has(body)) {
      return { err: 404 }
    }
    
    const bodyData = certificationBodies.get(body)
    certificationBodies.set(body, {
      ...bodyData,
      status: "approved",
    })
    
    return { ok: true }
  },
  
  "revoke-certification-body": (body) => {
    const caller = mockTxSender // Simulating tx-sender
    
    if (caller !== admin) {
      return { err: 403 }
    }
    
    if (!certificationBodies.has(body)) {
      return { err: 404 }
    }
    
    const bodyData = certificationBodies.get(body)
    certificationBodies.set(body, {
      ...bodyData,
      status: "revoked",
    })
    
    return { ok: true }
  },
  
  "is-approved-certification-body": (body) => {
    if (!certificationBodies.has(body)) {
      return false
    }
    
    const bodyData = certificationBodies.get(body)
    return bodyData.status === "approved"
  },
  
  "get-certification-body": (body) => {
    return certificationBodies.get(body) || null
  },
  
  "transfer-admin": (newAdmin) => {
    const caller = mockTxSender // Simulating tx-sender
    
    if (caller !== admin) {
      return { err: 403 }
    }
    
    admin = newAdmin
    return { ok: true }
  },
}

describe("Certification Body Verification Contract", () => {
  beforeEach(() => {
    // Reset state before each test
    certificationBodies = new Map()
    admin = mockTxSender
  })
  
  it("should register a certification body", () => {
    const result = contractFunctions["register-certification-body"]("EcoLandscapers", "ISO14001,LEED")
    expect(result).toEqual({ ok: true })
    
    const bodyData = contractFunctions["get-certification-body"](mockTxSender)
    expect(bodyData).toEqual({
      name: "EcoLandscapers",
      status: "pending",
      "registration-date": 123,
      credentials: "ISO14001,LEED",
    })
  })
  
  it("should approve a certification body", () => {
    contractFunctions["register-certification-body"]("EcoLandscapers", "ISO14001,LEED")
    const result = contractFunctions["approve-certification-body"](mockTxSender)
    expect(result).toEqual({ ok: true })
    
    const isApproved = contractFunctions["is-approved-certification-body"](mockTxSender)
    expect(isApproved).toBe(true)
  })
  
  it("should revoke a certification body", () => {
    contractFunctions["register-certification-body"]("EcoLandscapers", "ISO14001,LEED")
    contractFunctions["approve-certification-body"](mockTxSender)
    const result = contractFunctions["revoke-certification-body"](mockTxSender)
    expect(result).toEqual({ ok: true })
    
    const isApproved = contractFunctions["is-approved-certification-body"](mockTxSender)
    expect(isApproved).toBe(false)
  })
  
  it("should not allow non-admin to register a certification body", () => {
    admin = mockOtherUser // Change admin to simulate non-admin caller
    const result = contractFunctions["register-certification-body"]("EcoLandscapers", "ISO14001,LEED")
    expect(result).toEqual({ err: 403 })
  })
  
  it("should transfer admin rights", () => {
    const result = contractFunctions["transfer-admin"](mockOtherUser)
    expect(result).toEqual({ ok: true })
    expect(admin).toBe(mockOtherUser)
  })
})
