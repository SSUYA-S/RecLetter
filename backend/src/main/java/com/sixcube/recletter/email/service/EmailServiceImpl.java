package com.sixcube.recletter.email.service;

import com.sixcube.recletter.auth.exception.EmailSendException;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * 이메일 발송을 담당하는 클래스
 */

@Slf4j
@Service
@Transactional
@RequiredArgsConstructor
public class EmailServiceImpl implements EmailService {

    private final JavaMailSender emailSender;

    public void sendEmail(String toEmail, String title, String text) throws EmailSendException {

        SimpleMailMessage emailForm = createEmailForm(toEmail, title, text);

        try {
            emailSender.send(emailForm);
        } catch (RuntimeException e) {
            throw new EmailSendException();
        }
    }

    // 발신할 이메일 데이터 세팅
    // 수신자 이메일 주소, 이메일 제목, 이메일 내용을 입력 받아 SimpleMailMessage 객체를 생성하여 반환한다.
    public SimpleMailMessage createEmailForm(String toEmail, String title, String text) {
        SimpleMailMessage message = new SimpleMailMessage();
        message.setTo(toEmail);
        message.setSubject(title);
        message.setText(text);

        return message;
    }


}
