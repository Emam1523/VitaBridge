package com.vitabridge.model;

import jakarta.persistence.Embeddable;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Embeddable
@Data
@NoArgsConstructor
@AllArgsConstructor
public class Medication {
    
    private String name;
    private String dosage;
    private String quantity;
    private String frequency;
    private String duration;
    private String instructions;
}
