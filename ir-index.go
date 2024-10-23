package indexer

type InverseProtoBuilderService interface {
	BuildInverseIndexProto(
		ctx context.Context, values []IrIndexResult, changes entities.FileChanges,
	) (InverseIndexProto, error)
}
