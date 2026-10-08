package com.motorva;

import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

interface AssistantConversationRepository extends JpaRepository<AssistantConversation, UUID> {}
