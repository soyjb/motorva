package com.motorva;

import java.util.UUID;
import jakarta.persistence.*;

@Entity
@Table(name="assistant_conversations")
class AssistantConversation {
    @Id UUID id;
    @Column(nullable=false, columnDefinition="text") String transcript = "[]";
    @Version long version;
    protected AssistantConversation() {}
    AssistantConversation(UUID id) { this.id = id; }
}
