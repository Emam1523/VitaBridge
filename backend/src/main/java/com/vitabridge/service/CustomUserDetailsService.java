package com.vitabridge.service;

import com.vitabridge.model.User;
import com.vitabridge.repository.UserRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.stereotype.Service;

import java.util.Optional;

@Service
public class CustomUserDetailsService implements UserDetailsService {

    @Autowired
    private UserRepository userRepository;

 
    @Override
    public UserDetails loadUserByUsername(String identifier) throws UsernameNotFoundException {
        Optional<User> user = userRepository.findByEmail(identifier);
        if (user.isEmpty()) {
            user = userRepository.findByPhoneNumber(identifier);
        }
        return user.orElseThrow(() -> new UsernameNotFoundException(
                "User not found with identifier: " + identifier));
    }
}
