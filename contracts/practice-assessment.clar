;; Practice Assessment Contract
;; This contract assesses sustainable landscaping practices

(define-data-var admin principal tx-sender)

;; Data map to store practice criteria
(define-map practice-criteria uint
  {
    name: (string-ascii 100),
    description: (string-ascii 256),
    weight: uint,
    min-score: uint
  }
)

;; Data map to store practice assessments
(define-map assessments (tuple (property principal) (assessor principal))
  {
    property-id: (string-ascii 100),
    scores: (list 20 (tuple (criteria-id uint) (score uint))),
    total-score: uint,
    assessment-date: uint,
    status: (string-ascii 20)
  }
)

;; Counter for criteria IDs
(define-data-var next-criteria-id uint u1)

;; Public function to add a new practice criterion
(define-public (add-practice-criterion (name (string-ascii 100)) (description (string-ascii 256)) (weight uint) (min-score uint))
  (let ((caller tx-sender)
        (criteria-id (var-get next-criteria-id)))
    (if (is-eq caller (var-get admin))
        (begin
          (map-set practice-criteria criteria-id {
            name: name,
            description: description,
            weight: weight,
            min-score: min-score
          })
          (var-set next-criteria-id (+ criteria-id u1))
          (ok criteria-id))
        (err u403))))

;; Public function to submit a practice assessment
(define-public (submit-assessment (property principal) (property-id (string-ascii 100)) (scores (list 20 (tuple (criteria-id uint) (score uint)))))
  (let ((caller tx-sender)
        (total-score (fold calculate-total-score scores u0)))
    (map-set assessments (tuple (property property) (assessor caller)) {
      property-id: property-id,
      scores: scores,
      total-score: total-score,
      assessment-date: block-height,
      status: "submitted"
    })
    (ok total-score)))

;; Helper function to calculate total score
(define-private (calculate-total-score (score-tuple (tuple (criteria-id uint) (score uint))) (current-total uint))
  (let ((criteria-id (get criteria-id score-tuple))
        (score (get score score-tuple)))
    (match (map-get? practice-criteria criteria-id)
      criteria-data (+ current-total (* score (get weight criteria-data)))
      current-total)))

;; Public function to approve an assessment
(define-public (approve-assessment (property principal) (assessor principal))
  (let ((caller tx-sender))
    (if (is-eq caller (var-get admin))
        (match (map-get? assessments (tuple (property property) (assessor assessor)))
          assessment-data (begin
            (map-set assessments (tuple (property property) (assessor assessor))
              (merge assessment-data { status: "approved" }))
            (ok true))
          (err u404))
        (err u403))))

;; Read-only function to get assessment details
(define-read-only (get-assessment (property principal) (assessor principal))
  (map-get? assessments (tuple (property property) (assessor assessor))))

;; Read-only function to get criterion details
(define-read-only (get-criterion (criteria-id uint))
  (map-get? practice-criteria criteria-id))

;; Function to check if an assessment passes minimum requirements
(define-read-only (passes-minimum-requirements (property principal) (assessor principal))
  (match (map-get? assessments (tuple (property property) (assessor assessor)))
    assessment-data
      (let ((scores (get scores assessment-data)))
        (is-eq (fold check-min-scores scores u0) u0))
    false))

;; Helper function to check minimum scores
(define-private (check-min-scores (score-tuple (tuple (criteria-id uint) (score uint))) (failure-count uint))
  (let ((criteria-id (get criteria-id score-tuple))
        (score (get score score-tuple)))
    (match (map-get? practice-criteria criteria-id)
      criteria-data
        (if (< score (get min-score criteria-data))
            (+ failure-count u1)
            failure-count)
      failure-count)))
