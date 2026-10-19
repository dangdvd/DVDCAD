;;; Tiện ích AutoLISP mẫu cho DVDCAD — nạp bằng APPLOAD
;;; STT      : đánh số thứ tự (tiền tố + số tăng dần) tại các điểm bấm
;;; TL       : tổng chiều dài đường / cung / tròn / đa tuyến (kể cả đoạn cong)
;;; DTL      : đổi lớp các đối tượng theo lớp của một đối tượng mẫu
;;; KHUNGTEN : vẽ khung bản vẽ (khung ngoài + khung trong lề trái 25) bằng (command "RECTANG" ...)

(defun c:STT (/ n tg h p s)
  (setq n (getint "\nSố bắt đầu <1>: "))
  (if (null n) (setq n 1))
  (setq tg (getstring "\nTiền tố (vd C, Enter = không có): "))
  (setq h (getdist "\nCao chữ <2.5>: "))
  (if (null h) (setq h 2.5))
  (while (setq p (getpoint (strcat "\nĐiểm đặt số " tg (itoa n) " (Enter = xong): ")))
    (setq s (strcat tg (itoa n)))
    (entmake (list '(0 . "TEXT") (cons 10 p) (cons 11 p) (cons 40 h) (cons 1 s) '(72 . 1) '(73 . 2)))
    (setq n (1+ n)))
  (princ))

;; chiều dài một đoạn đa tuyến có bulge
(defun tl-doan (p1 p2 b / c th)
  (setq c (distance p1 p2))
  (if (or (null b) (equal b 0.0 1e-12))
    c
    (progn (setq th (* 4.0 (atan (abs b))))
           (/ (* c th) (* 2.0 (sin (/ th 2.0)))))))

(defun tl-dai (ed / ty a pts bs i tot)
  (setq ty (cdr (assoc 0 ed)))
  (cond
    ((= ty "LINE") (distance (cdr (assoc 10 ed)) (cdr (assoc 11 ed))))
    ((= ty "CIRCLE") (* 2.0 pi (cdr (assoc 40 ed))))
    ((= ty "ARC")
     (setq a (- (cdr (assoc 51 ed)) (cdr (assoc 50 ed))))
     (if (< a 0) (setq a (+ a (* 2 pi))))
     (* a (cdr (assoc 40 ed))))
    ((= ty "LWPOLYLINE")
     (setq pts '() bs '())
     (foreach g ed
       (cond ((= (car g) 10) (setq pts (cons (cdr g) pts)))
             ((= (car g) 42) (setq bs (cons (cdr g) bs)))))
     (setq pts (reverse pts) bs (reverse bs) i 0 tot 0.0)
     (repeat (1- (length pts))
       (setq tot (+ tot (tl-doan (nth i pts) (nth (1+ i) pts) (nth i bs))) i (1+ i)))
     (if (= 1 (logand 1 (cdr (assoc 70 ed))))
       (setq tot (+ tot (tl-doan (last pts) (car pts) (last bs)))))
     tot)
    (T 0.0)))

(defun c:TL (/ ss i tot)
  (setq ss (ssget '((0 . "LINE,ARC,CIRCLE,LWPOLYLINE"))))
  (if ss
    (progn
      (setq i 0 tot 0.0)
      (repeat (sslength ss)
        (setq tot (+ tot (tl-dai (entget (ssname ss i)))) i (1+ i)))
      (princ (strcat "\nTổng chiều dài: " (rtos tot 2 3) " (" (itoa (sslength ss)) " đối tượng)"))))
  (princ))

(defun c:DTL (/ m lay ss i ed)
  (setq m (entsel "\nChọn đối tượng mẫu (lấy lớp): "))
  (if m
    (progn
      (setq lay (cdr (assoc 8 (entget (car m)))))
      (princ (strcat "\nLớp đích: " lay))
      (setq ss (ssget))
      (if ss
        (progn
          (setq i 0)
          (repeat (sslength ss)
            (setq ed (entget (ssname ss i)))
            (entmod (subst (cons 8 lay) (assoc 8 ed) ed))
            (setq i (1+ i)))
          (princ (strcat "\nĐã chuyển " (itoa (sslength ss)) " đối tượng sang lớp " lay))))))
  (princ))

(defun c:KHUNGTEN (/ p1 p2 tl)
  (setq tl (getreal "\nTỉ lệ khung (1 = khổ thật, mm) <1>: "))
  (if (null tl) (setq tl 1.0))
  (setq p1 (getpoint "\nGóc dưới trái khung: "))
  (if p1
    (progn
      (setq p2 (getcorner p1 "\nGóc trên phải: "))
      (if p2
        (progn
          (command "RECTANG" p1 p2)
          (command "RECTANG"
                   (list (+ (car p1) (* 25 tl)) (+ (cadr p1) (* 5 tl)))
                   (list (- (car p2) (* 5 tl)) (- (cadr p2) (* 5 tl))))
          (princ "\nĐã vẽ khung bản vẽ.")))))
  (princ))

(princ "\nĐã nạp tiện ích LISP: STT, TL, DTL, KHUNGTEN")
(princ)
