;; Certification Body Verification Contract
;; This contract validates and manages certification bodies

(define-data-var admin principal tx-sender)

;; Data map to store certification bodies
(define-map certification-bodies principal
  {
    name: (string-ascii 100),
    status: (string-ascii 20),
    registration-date: uint,
    credentials: (string-ascii 256)
  }
)

;; Public function to register a new certification body
(define-public (register-certification-body (name (string-ascii 100)) (credentials (string-ascii 256)))
  (let ((caller tx-sender))
    (if (is-eq caller (var-get admin))
        (begin
          (map-set certification-bodies caller {
            name: name,
            status: "pending",
            registration-date: block-height,
            credentials: credentials
          })
          (ok true))
        (err u403))))

;; Public function to approve a certification body
(define-public (approve-certification-body (body principal))
  (let ((caller tx-sender))
    (if (is-eq caller (var-get admin))
        (match (map-get? certification-bodies body)
          body-data (begin
            (map-set certification-bodies body
              (merge body-data { status: "approved" }))
            (ok true))
          (err u404))
        (err u403))))

;; Public function to revoke a certification body
(define-public (revoke-certification-body (body principal))
  (let ((caller tx-sender))
    (if (is-eq caller (var-get admin))
        (match (map-get? certification-bodies body)
          body-data (begin
            (map-set certification-bodies body
              (merge body-data { status: "revoked" }))
            (ok true))
          (err u404))
        (err u403))))

;; Read-only function to check if a certification body is approved
(define-read-only (is-approved-certification-body (body principal))
  (match (map-get? certification-bodies body)
    body-data (is-eq (get status body-data) "approved")
    false))

;; Read-only function to get certification body details
(define-read-only (get-certification-body (body principal))
  (map-get? certification-bodies body))

;; Function to transfer admin rights
(define-public (transfer-admin (new-admin principal))
  (let ((caller tx-sender))
    (if (is-eq caller (var-get admin))
        (begin
          (var-set admin new-admin)
          (ok true))
        (err u403))))
