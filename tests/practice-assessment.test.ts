import { describe, it, expect, beforeEach } from "vitest"

// Mock the Clarity environment
const mockTxSender = "ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM"
const mockOtherUser = "ST2CY5V39NHDPWSXMW9QDT3HC3GD6Q6XX4CFRK9AG"
const mockProperty = "ST3AMFB2T1XQCM6A5VZAY1VX2SXBJ1QKFJPGVAKS7"

// Mock contract state
let practiceCriteria = new Map()
let assessments = new Map()
let nextCriteriaId = 1
let admin = mockTxSender

// Helper function to create assessment key
const createAssessmentKey = (property, assessor) => `${property}-${assessor}`

// Mock contract functions
const contractFunctions = {
  "add-practice-criterion": (name, description, weight, minScore) => {
    const caller = mockTxSender // Simulating tx-sender
    
    if (caller !== admin) {
      return { err: 403 }
    }
    
    const criteriaId = nextCriteriaId
    practiceCriteria.set(criteriaId, {
      name,
      description,
      weight,
      "min-score": minScore,
    })
    
    nextCriteriaId++
    return { ok: criteriaId }
  },
  
  "submit-assessment": (property, propertyId, scores) => {
    const caller = mockTxSender // Simulating tx-sender
    const key = createAssessmentKey(property, caller)
    
    // Calculate total score
    let totalScore = 0
    for (const score of scores) {
      const criteriaData = practiceCriteria.get(score["criteria-id"])
      if (criteriaData) {
        totalScore += score.score * criteriaData.weight
      }
    }
    
    assessments.set(key, {
      "property-id": propertyId,
      scores,
      "total-score": totalScore,
      "assessment-date": 123, // Mock block height
      status: "submitted",
    })
    
    return { ok: totalScore }
  },
  
  "approve-assessment": (property, assessor) => {
    const caller = mockTxSender // Simulating tx-sender
    const key = createAssessmentKey(property, assessor)
    
    if (caller !== admin) {
      return { err: 403 }
    }
    
    if (!assessments.has(key)) {
      return { err: 404 }
    }
    
    const assessmentData = assessments.get(key)
    assessments.set(key, {
      ...assessmentData,
      status: "approved",
    })
    
    return { ok: true }
  },
  
  "get-assessment": (property, assessor) => {
    const key = createAssessmentKey(property, assessor)
    return assessments.get(key) || null
  },
  
  "get-criterion": (criteriaId) => {
    return practiceCriteria.get(criteriaId) || null
  },
  
  "passes-minimum-requirements": (property, assessor) => {
    const key = createAssessmentKey(property, assessor)
    
    if (!assessments.has(key)) {
      return false
    }
    
    const assessmentData = assessments.get(key)
    
    // Check if all scores meet minimum requirements
    for (const score of assessmentData.scores) {
      const criteriaData = practiceCriteria.get(score["criteria-id"])
      if (criteriaData && score.score < criteriaData["min-score"]) {
        return false
      }
    }
    
    return true
  },
}

describe("Practice Assessment Contract", () => {
  beforeEach(() => {
    // Reset state before each test
    practiceCriteria = new Map()
    assessments = new Map()
    nextCriteriaId = 1
    admin = mockTxSender
  })
  
  it("should add a practice criterion", () => {
    const result = contractFunctions["add-practice-criterion"](
        "Water Conservation",
        "Measures to reduce water usage",
        3,
        7,
    )
    expect(result).toEqual({ ok: 1 })
    
    const criterionData = contractFunctions["get-criterion"](1)
    expect(criterionData).toEqual({
      name: "Water Conservation",
      description: "Measures to reduce water usage",
      weight: 3,
      "min-score": 7,
    })
  })
  
  it("should submit an assessment", () => {
    contractFunctions["add-practice-criterion"]("Water Conservation", "Measures to reduce water usage", 3, 7)
    contractFunctions["add-practice-criterion"]("Native Plants", "Use of native plant species", 2, 6)
    
    const scores = [
      { "criteria-id": 1, score: 8 },
      { "criteria-id": 2, score: 9 },
    ]
    
    const result = contractFunctions["submit-assessment"](mockProperty, "PROP-123", scores)
    expect(result).toEqual({ ok: 8 * 3 + 9 * 2 }) // 8*3 + 9*2 = 24 + 18 = 42
    
    const assessmentData = contractFunctions["get-assessment"](mockProperty, mockTxSender)
    expect(assessmentData).toHaveProperty("total-score", 42)
    expect(assessmentData).toHaveProperty("status", "submitted")
  })
  
  it("should approve an assessment", () => {
    contractFunctions["add-practice-criterion"]("Water Conservation", "Measures to reduce water usage", 3, 7)
    
    const scores = [{ "criteria-id": 1, score: 8 }]
    
    contractFunctions["submit-assessment"](mockProperty, "PROP-123", scores)
    const result = contractFunctions["approve-assessment"](mockProperty, mockTxSender)
    expect(result).toEqual({ ok: true })
    
    const assessmentData = contractFunctions["get-assessment"](mockProperty, mockTxSender)
    expect(assessmentData).toHaveProperty("status", "approved")
  })
  
  it("should check if assessment passes minimum requirements", () => {
    contractFunctions["add-practice-criterion"]("Water Conservation", "Measures to reduce water usage", 3, 7)
    contractFunctions["add-practice-criterion"]("Native Plants", "Use of native plant species", 2, 6)
    
    // Passing scores
    const passingScores = [
      { "criteria-id": 1, score: 8 },
      { "criteria-id": 2, score: 7 },
    ]
    
    contractFunctions["submit-assessment"](mockProperty, "PROP-123", passingScores)
    const passingResult = contractFunctions["passes-minimum-requirements"](mockProperty, mockTxSender)
    expect(passingResult).toBe(true)
    
    // Reset for failing test
    assessments = new Map()
    
    // Failing scores
    const failingScores = [
      { "criteria-id": 1, score: 8 },
      { "criteria-id": 2, score: 5 }, // Below min-score of 6
    ]
    
    contractFunctions["submit-assessment"](mockProperty, "PROP-123", failingScores)
    const failingResult = contractFunctions["passes-minimum-requirements"](mockProperty, mockTxSender)
    expect(failingResult).toBe(false)
  })
})
