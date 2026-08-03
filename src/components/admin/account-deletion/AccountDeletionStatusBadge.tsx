import React, { memo } from "react";
import { Text, View } from "react-native";

import {
    AccountDeletionRequestStatusName,
    getAccountDeletionStatusLabel,
} from "../../../types/adminAccountDeletion";

interface Props {
  status: AccountDeletionRequestStatusName | string;
}

interface BadgeStyle {
  background: string;
  text: string;
}

function getBadgeStyle(status: string): BadgeStyle {
  switch (status) {
    case "PendienteConfirmacion":
      return {
        background: "#FEF3C7",
        text: "#92400E",
      };

    case "Confirmada":
      return {
        background: "#DBEAFE",
        text: "#1D4ED8",
      };

    case "EnRevision":
      return {
        background: "#EDE9FE",
        text: "#6D28D9",
      };

    case "Aprobada":
      return {
        background: "#DCFCE7",
        text: "#15803D",
      };

    case "Rechazada":
      return {
        background: "#FEE2E2",
        text: "#B91C1C",
      };

    case "CanceladaPorUsuario":
      return {
        background: "#E5E7EB",
        text: "#4B5563",
      };

    case "Procesada":
      return {
        background: "#D1FAE5",
        text: "#065F46",
      };

    case "Expirada":
      return {
        background: "#F3F4F6",
        text: "#6B7280",
      };

    default:
      return {
        background: "#E5E7EB",
        text: "#374151",
      };
  }
}

function AccountDeletionStatusBadge({
  status,
}: Props) {
  const colors = getBadgeStyle(status);

  return (
    <View
      style={{
        alignSelf: "flex-start",
        backgroundColor: colors.background,
        borderRadius: 999,
        paddingHorizontal: 12,
        paddingVertical: 6,
      }}
    >
      <Text
        style={{
          color: colors.text,
          fontWeight: "700",
          fontSize: 12,
        }}
      >
        {getAccountDeletionStatusLabel(status)}
      </Text>
    </View>
  );
}

export default memo(AccountDeletionStatusBadge);